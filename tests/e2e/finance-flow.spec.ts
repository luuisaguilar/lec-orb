import { test, expect } from "@playwright/test";
import { installDemoApiMocks } from "./support/demo-api";

/**
 * Finance Modules E2E Tests
 * -------------------------
 * These tests authenticate with a real Supabase user first, then mock the
 * finance/user APIs at the browser boundary to keep the flows deterministic.
 */

test.describe("Finance Module Operations", () => {
    test.beforeEach(async ({ page }) => {
        await installDemoApiMocks(page);
        await page.goto("/dashboard/finanzas/caja-chica");
    });

    test("should display the Petty Cash dashboard with stats", async ({ page }) => {
        await expect(page.getByRole("heading", { name: "Caja Chica" })).toBeVisible();
        await expect(page.getByText("Saldo Actual")).toBeVisible();
        await expect(page.locator("table")).toBeVisible();
    });

    test("should open the 'Nuevo Movimiento' modal and validate fields", async ({ page }) => {
        await page.getByRole("button", { name: /Nuevo Movimiento/i }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog.getByText("Registrar Movimiento")).toBeVisible();

        await page.getByRole("button", { name: "Guardar" }).click();
        await expect(dialog.getByText("Registrar Movimiento")).toBeVisible();
    });

    test("should filter the movements table", async ({ page }) => {
        const searchInput = page.getByPlaceholder(/Buscar por concepto/i);
        await searchInput.fill("Papeleria");

        await expect(page.getByText("Papeleria de oficina")).toBeVisible();
        await expect(page.getByText("Taxi al evento")).not.toBeVisible();
        await expect(page.locator("table")).toBeVisible();
    });

    test("should navigate to Budget and update a value", async ({ page }) => {
        await page.goto("/dashboard/finanzas/presupuesto");
        await expect(page.getByRole("heading", { name: /Presupuesto/i })).toBeVisible();

        const firstInput = page.locator('input[type="number"]').first();
        await firstInput.fill("5000");
        await page.getByRole("button", { name: /^Guardar$/i }).click();

        await expect(page.getByText(/lineas guardadas|líneas guardadas/i)).toBeVisible();
    });

    test("should export data to Excel", async ({ page }) => {
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: /Exportar/i }).click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(/^caja-chica-.*\.xlsx$/);
    });
});
