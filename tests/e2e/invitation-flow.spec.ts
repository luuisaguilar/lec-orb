import { test, expect } from "@playwright/test";
import { installDemoApiMocks } from "./support/demo-api";

/**
 * Invitation Flow E2E Tests
 * -------------------------
 * Verifies the full "Invitar Usuario" flow against the local demo harness.
 */

const INVITE_EMAIL = "qa.invite@lec.mx";

test.describe("Invitation Flow", () => {
    test.beforeEach(async ({ page }) => {
        await installDemoApiMocks(page);
        await page.goto("/dashboard/users");
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

        await expect(dialog.getByText(/Correo electronico invalido/i)).toBeVisible();
    });

    test("should create an invitation and show it in the Invitaciones tab", async ({ page }) => {
        await page.getByRole("button", { name: /Invitar Usuario/i }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        await dialog.getByPlaceholder("correo@ejemplo.com").fill(INVITE_EMAIL);
        await dialog.getByRole("button", { name: /Crear y/i }).click();

        await expect(
            dialog.getByText(/Email de invitacion enviado|Enlace de invitacion listo|Invitacion creada/i)
        ).toBeVisible({ timeout: 15_000 });

        await dialog.getByRole("button", { name: /Cerrar/i }).click();
        await expect(dialog).not.toBeVisible();

        await page.getByRole("tab", { name: /Invitaciones/i }).click();
        await expect(page.getByText(INVITE_EMAIL).first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText("Pendiente").first()).toBeVisible();
    });

    test("should show the pending count badge on the Invitaciones tab after invite", async ({ page }) => {
        const uniqueInvite = `qa+${Date.now()}@lec.mx`;

        await page.getByRole("tab", { name: /Invitaciones/i }).click();
        await page.waitForSelector("tbody tr, [data-testid='no-invitations'], .text-muted-foreground", { timeout: 10_000 });
        const rowsBefore = await page.locator("tbody tr").count();

        await page.getByRole("tab", { name: /Usuarios Activos/i }).click();
        await page.getByRole("button", { name: /Invitar Usuario/i }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByPlaceholder("correo@ejemplo.com").fill(uniqueInvite);
        await dialog.getByRole("button", { name: /Crear y/i }).click();
        await expect(
            dialog.getByText(/Email de invitacion enviado|Enlace de invitacion listo|Invitacion creada/i)
        ).toBeVisible({ timeout: 15_000 });
        await dialog.getByRole("button", { name: /Cerrar/i }).click();

        const tab = page.getByRole("tab", { name: /Invitaciones/i });
        await expect(tab.locator("span.rounded-full")).toBeVisible();

        await tab.click();
        await page.waitForSelector("tbody tr", { timeout: 10_000 });
        const rowsAfter = await page.locator("tbody tr").count();
        expect(rowsAfter).toBeGreaterThanOrEqual(rowsBefore + 1);
    });
});
