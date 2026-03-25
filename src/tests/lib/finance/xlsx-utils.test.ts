import { describe, it, expect, vi } from "vitest";
import { exportToXLSX } from "@/lib/finance/export-xlsx";
import { parseLegacyExcel } from "@/lib/finance/import-xlsx";
import * as XLSX from "xlsx";

vi.mock("xlsx", () => ({
    utils: {
        json_to_sheet: vi.fn(),
        book_new: vi.fn(),
        book_append_sheet: vi.fn(),
        sheet_to_json: vi.fn(() => [
            { Fecha: "2024-03-01", Concepto: "Test Income", Entrada: 100, Salida: 0, Categoría: "Ventas" },
            { Fecha: "2024-03-02", Concepto: "Test Expense", Entrada: 0, Salida: 50, Categoría: "Gastos" },
        ]),
    },
    read: vi.fn(() => ({
        SheetNames: ["LEC"],
        Sheets: { LEC: {} },
    })),
    writeFile: vi.fn(),
}));

/**
 * Custom FileReader mock for JSDOM/Node environment
 */
class MockFileReader {
    onload: any = null;
    result: any = null;
    readAsArrayBuffer(file: any) {
        this.result = new ArrayBuffer(8);
        if (this.onload) {
            this.onload({ target: { result: this.result } });
        }
    }
}

vi.stubGlobal("FileReader", MockFileReader);

describe("Finance XLSX Utilities", () => {
    describe("exportToXLSX", () => {
        it("should call XLSX functions with correct data", () => {
            const mockData = [
                { date: "2024-03-01", concept: "Test", amount: 100, type: "INCOME", petty_cash_categories: { name: "Cat1" } }
            ] as any;
            exportToXLSX(mockData, "test-file");
            expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
            expect(XLSX.writeFile).toHaveBeenCalled();
        });
    });

    describe("parseLegacyExcel", () => {
        it("should parse legacy multi-sheet Excel correctly", async () => {
            const mockFile = { name: "test.xlsx" } as any;
            const mockOrgs = { "LEC": "org-id-1" };
            const mockCats = { "Ventas": "cat-id-1", "Gastos": "cat-id-2" };

            const result: any = await parseLegacyExcel(mockFile, mockOrgs, mockCats);
            
            expect(result).toHaveLength(2);
            expect(result[0].concept).toBe("Test Income");
            expect(result[1].type).toBe("EXPENSE");
        });
    });
});
