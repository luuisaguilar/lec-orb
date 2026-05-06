import { test, expect } from "@playwright/test";
import { installDemoApiMocks } from "./support/demo-api";

test.describe("Payroll role rates settings", () => {
    test.beforeEach(async ({ page }) => {
        await installDemoApiMocks(page);
    });

    test("lists mocked role rates", async ({ page }) => {
        await page.goto("/dashboard/settings/role-rates");
        await expect(page.getByRole("heading", { name: "Tarifas por rol" })).toBeVisible();
        await expect(page.getByRole("cell", { name: "INVIGILATOR" })).toBeVisible();
        await expect(page.getByRole("cell", { name: "EVALUATOR" })).toBeVisible();
        await expect(page.getByText("FCE")).toBeVisible();
    });

    test("nomina page links to role rates", async ({ page }) => {
        await page.goto("/dashboard/nomina");
        await page.getByRole("link", { name: "Tarifas por rol" }).click();
        await expect(page).toHaveURL(/\/dashboard\/settings\/role-rates/);
    });
});
