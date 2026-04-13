import { test, expect } from "@playwright/test";

/**
 * Invitation Flow E2E Tests
 * -------------------------
 * Verifies the full "Invitar Usuario" flow from the Usuarios dashboard.
 *
 * Prerequisites:
 *   - TEST_USER_EMAIL / TEST_USER_PASSWORD set (or defaults below)
 *   - The app is running at http://localhost:3000
 */

const ADMIN_EMAIL = process.env.TEST_USER_EMAIL ?? "pixelheadusa@gmail.com";
const ADMIN_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
const INVITE_EMAIL = process.env.TEST_INVITE_EMAIL ?? "luisaguilaraguila@gmail.com";

async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel(/correo/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe("Invitation Flow", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto("/dashboard/users");
        // Wait for the page heading to be visible
        await expect(page.getByRole("heading", { name: /Usuarios y Accesos/i })).toBeVisible();
    });

    test("should open the Invitar Usuario dialog", async ({ page }) => {
        await page.getByRole("button", { name: /Invitar Usuario/i }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText("Invitar al equipo")).toBeVisible();
        await expect(dialog.getByPlaceholder("correo@ejemplo.com")).toBeVisible();
    });

    test("should show validation error for invalid email", async ({ page }) => {
        await page.getByRole("button", { name: /Invitar Usuario/i }).click();

        const dialog = page.getByRole("dialog");
        const emailInput = dialog.getByPlaceholder("correo@ejemplo.com");

        await emailInput.fill("not-an-email");
        await dialog.getByRole("button", { name: /Crear y/i }).click();

        await expect(dialog.getByText(/correo electronico invalido/i)).toBeVisible();
    });

    test("should create an invitation and show it in the Invitaciones tab", async ({ page }) => {
        // Open invite dialog
        await page.getByRole("button", { name: /Invitar Usuario/i }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Fill in the email
        await dialog.getByPlaceholder("correo@ejemplo.com").fill(INVITE_EMAIL);

        // Role defaults to "operador" — keep it; optionally change to supervisor
        // await dialog.getByRole("combobox").click();
        // await page.getByRole("option", { name: /Supervisor/i }).click();

        // Submit (with email toggle ON by default → "Crear y enviar")
        await dialog.getByRole("button", { name: /Crear y/i }).click();

        // Wait for the success state — dialog shows the join link card
        await expect(dialog.getByText(/Email de invitacion enviado|Enlace de invitacion listo|Invitacion creada/i)).toBeVisible({ timeout: 15_000 });

        // Close dialog
        await dialog.getByRole("button", { name: /Cerrar/i }).click();
        await expect(dialog).not.toBeVisible();

        // Switch to Invitaciones tab
        await page.getByRole("tab", { name: /Invitaciones/i }).click();

        // The invited email should appear in the table (may have multiple rows for this email)
        await expect(page.getByText(INVITE_EMAIL).first()).toBeVisible({ timeout: 10_000 });

        // Status badge should be "Pendiente"
        await expect(page.getByText("Pendiente").first()).toBeVisible();
    });

    test("should show the pending count badge on the Invitaciones tab after invite", async ({ page }) => {
        // Navigate to invitations tab and wait for the table to settle, then count
        await page.getByRole("tab", { name: /Invitaciones/i }).click();
        // Wait for async data to load: spinner gone and table (or empty state) is visible
        await page.waitForSelector("tbody tr, [data-testid='no-invitations'], .text-muted-foreground", { timeout: 10_000 });
        const rowsBefore = await page.locator("tbody tr").count();

        // Go back to active tab and invite a new user
        await page.getByRole("tab", { name: /Usuarios Activos/i }).click();
        await page.getByRole("button", { name: /Invitar Usuario/i }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByPlaceholder("correo@ejemplo.com").fill(INVITE_EMAIL);
        await dialog.getByRole("button", { name: /Crear y/i }).click();
        await expect(dialog.getByText(/Email de invitacion enviado|Enlace de invitacion listo|Invitacion creada/i)).toBeVisible({ timeout: 15_000 });
        await dialog.getByRole("button", { name: /Cerrar/i }).click();

        // Tab should now have a red badge with count ≥ 1
        const tab = page.getByRole("tab", { name: /Invitaciones/i });
        await expect(tab.locator("span.rounded-full")).toBeVisible();

        // Invitations list should have at least rowsBefore + 1 rows
        await tab.click();
        await page.waitForSelector("tbody tr", { timeout: 10_000 });
        const rowsAfter = await page.locator("tbody tr").count();
        expect(rowsAfter).toBeGreaterThanOrEqual(rowsBefore + 1);
    });
});
