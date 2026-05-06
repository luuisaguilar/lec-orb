import { test, expect } from "@playwright/test";

/**
 * Join portal page talks to Supabase (admin) on the server.
 * With a missing/invalid token you should see the failure state, not the guest signup card.
 */
test.describe("Join portal invitation page", () => {
    test("shows failure UI for unknown token", async ({ page }) => {
        await page.goto("/join-portal/00000000000000000000000000000000", { waitUntil: "networkidle" });

        await expect(
            page.getByRole("heading", {
                name: /Enlace expirado|No se pudo validar|Enlace ya utilizado/,
            })
        ).toBeVisible({ timeout: 25_000 });

        await expect(page.getByRole("link", { name: /inicio de sesión|Ir al inicio/i })).toBeVisible();
    });
});
