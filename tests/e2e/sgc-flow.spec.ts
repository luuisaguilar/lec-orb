import { test, expect } from "@playwright/test";

test.describe("SGC (Quality Management) Module E2E", () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to SGC dashboard
        await page.goto("/dashboard/sgc");
        // Wait for page to load
        await expect(page.locator("h1")).toContainText("Módulo de Calidad (SGC)");
    });

    test("should switch between SGC tabs", async ({ page }) => {
        // Nonconformities is default
        await expect(page.locator("text=No Conformidades")).toBeVisible();
        await expect(page.locator("text=Registro de No Conformidades")).toBeVisible();

        // Switch to CAPA Actions
        await page.getByRole("tab", { name: "Acciones CAPA" }).click();
        await expect(page.locator("text=Listado CAPA")).toBeVisible();
        await expect(page.locator("text=Nueva Accion")).toBeVisible();

        // Switch to Process Map
        await page.getByRole("tab", { name: "Mapa de Procesos" }).click();
        await expect(page.locator("text=Procesos Estratégicos")).toBeVisible();
    });

    test("should open nonconformity detail sheet", async ({ page }) => {
        // Ensure we are on NC tab
        await page.getByRole("tab", { name: "No Conformidades" }).click();
        
        // Wait for table to have at least one row or empty state
        const table = page.locator("table");
        await expect(table).toBeVisible();

        // If there are items, click the first one's Eye icon
        const firstEye = page.locator("table tbody tr button").first();
        if (await firstEye.isVisible()) {
            await firstEye.click();
            
            // Check if sheet opened
            const sheet = page.locator("div[role='dialog']"); // Sheet is a dialog
            await expect(sheet).toBeVisible();
            await expect(sheet.locator("button", { hasText: "Editar" })).toBeVisible();
            
            // Close sheet
            await page.keyboard.press("Escape");
        }
    });

    test("should respect RBAC - create button visibility", async ({ page }) => {
        // Assuming auth setup provides a user with 'edit' permissions
        await page.getByRole("tab", { name: "No Conformidades" }).click();
        const createBtn = page.locator("button", { hasText: "Nueva NC" });
        
        // This test validates that the button IS present for the current user
        // (In a full suite, we would test with a 'viewer' user where it should NOT be present)
        await expect(createBtn).toBeVisible();
    });
});
