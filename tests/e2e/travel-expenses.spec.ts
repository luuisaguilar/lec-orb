import { test, expect } from "@playwright/test";
import { installDemoApiMocks } from "./support/demo-api";

/**
 * Travel Expenses Module E2E Tests
 */

test.describe("Travel Expenses Module", () => {
    test.beforeEach(async ({ page }) => {
        await installDemoApiMocks(page);
        await page.goto("/dashboard/finanzas/viaticos");
    });

    test("should display the Viaticos dashboard with summary cards", async ({ page }) => {
        await expect(page.getByRole("heading", { name: /Modulo de Viaticos/i })).toBeVisible();
        await expect(page.getByText(/Solicitudes/i).first()).toBeVisible();
        await expect(page.getByText(/Pendientes/i).first()).toBeVisible();
        await expect(page.getByText(/Monto solicitado/i).first()).toBeVisible();
    });

    test("should create a new travel report", async ({ page }) => {
        await page.getByLabel(/Colaborador/i).fill("Juan Perez");
        await page.getByLabel(/Destino/i).fill("Guadalajara");
        await page.getByLabel(/Motivo/i).fill("Visita a sucursal");
        
        // Use standard date strings for the input[type="date"]
        await page.getByLabel(/Inicio/i).fill("2026-05-10");
        await page.getByLabel(/Fin/i).fill("2026-05-12");
        
        await page.getByLabel(/Monto solicitado/i).fill("1500");
        
        await page.getByRole("button", { name: /Crear solicitud/i }).click();
        
        await expect(page.getByText(/Solicitud de viaticos creada/i)).toBeVisible();
        await expect(page.getByText("Guadalajara")).toBeVisible();
    });

    test("should approve a pending report", async ({ page }) => {
        // Select the mock report "Demo Admin"
        await page.getByRole('button', { name: /Demo Admin/i }).click();
        
        await expect(page.getByText("Aprobacion y estatus")).toBeVisible();
        
        // Fill approval notes
        await page.getByLabel(/Notas de aprobacion/i).fill("Todo en orden, aprobado");
        
        // Click Approve
        await page.getByRole('button', { name: /^Aprobar$/i }).click();
        
        await expect(page.getByText(/Estatus actualizado/i)).toBeVisible();
    });

    test("should add a receipt to a report", async ({ page }) => {
        await page.getByRole('button', { name: /Demo Admin/i }).click();
        
        await expect(page.getByText("Comprobantes (Excel/PDF)")).toBeVisible();
        
        await page.getByLabel(/Nombre del archivo/i).fill("Recibo_Hotel.pdf");
        await page.getByLabel(/Monto \(opcional\)/i).fill("1200");
        await page.getByLabel(/URL del comprobante/i).fill("https://example.com/recibo.pdf");
        
        await page.getByRole('button', { name: /Agregar comprobante/i }).click();
        
        await expect(page.getByText(/Comprobante agregado/i)).toBeVisible();
        await expect(page.getByText("Recibo_Hotel.pdf")).toBeVisible();
    });
});
