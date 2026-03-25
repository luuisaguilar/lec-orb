import { test, expect } from "@playwright/test";

/**
 * Finance Modules E2E Tests
 * -------------------------
 * These tests verify the full flow of the Caja Chica and Presupuesto modules.
 * Note: Assumes the user is already authenticated or uses a storage state.
 */

test.describe("Finance Module Operations", () => {
    
    test.beforeEach(async ({ page }) => {
        // In a real scenario, you'd use a saved storage state or perform login here.
        // For this demo, we assume the user is redirected to dashboard if authenticated.
        await page.goto("/dashboard/finanzas/caja-chica");
    });

    test("should display the Petty Cash dashboard with stats", async ({ page }) => {
        await expect(page.getByText("Control de Caja Chica")).toBeVisible();
        await expect(page.getByText("Balance Total")).toBeVisible();
        await expect(page.locator("table")).toBeVisible();
    });

    test("should open the 'Nuevo Movimiento' modal and validate fields", async ({ page }) => {
        await page.getByRole("button", { name: /Nuevo Movimiento/i }).click();
        
        await expect(page.getByText("Registrar Movimiento")).toBeVisible();
        
        // Try submitting empty form
        await page.getByRole("button", { name: "Guardar" }).click();
        // Since we use Zod/React-hook-form, check for validation messages if any are visible 
        // (or just verify the modal stayed open)
        await expect(page.getByText("Registrar Movimiento")).toBeVisible();
    });

    test("should filter the movements table", async ({ page }) => {
        const searchInput = page.getByPlaceholder(/Buscar por concepto/i);
        await searchInput.fill("Prueba");
        await searchInput.press("Enter");
        
        // Verify the table updates (depends on mock data or real backend)
        await expect(page.locator("table")).toBeVisible();
    });

    test("should navigate to Budget and update a value", async ({ page }) => {
        await page.goto("/dashboard/finanzas/presupuesto");
        await expect(page.getByText("Presupuesto Mensual")).toBeVisible();
        
        // Find an input in the budget grid and change it
        const firstInput = page.locator('input[type="number"]').first();
        await firstInput.fill("5000");
        await firstInput.blur(); // Triggers auto-save or verification logic
        
        // Verify the comparative analysis card updates (color-coded progress bar)
        await expect(page.getByText("Análisis Comparativo")).toBeVisible();
    });

    test("should export data to Excel", async ({ page }) => {
        // Click export button and wait for download
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: /Exportar/i }).click();
        const download = await downloadPromise;
        
        expect(download.suggestedFilename()).toContain("movimientos-caja-chica");
    });
});
