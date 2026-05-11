import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportToXLSX } from "@/lib/finance/export-xlsx";
import * as XLSX from "xlsx";

vi.mock("exceljs", () => {
    function mkRow(vals: unknown[]) {
        return {
            cellCount: vals.length,
            getCell: (c: number) => ({ value: vals[c - 1] }),
        };
    }
    class MockWorkbook {
        worksheets = [
            {
                name: "LEC",
                rowCount: 10,
                eachRow(opts: unknown, cb?: (row: ReturnType<typeof mkRow>, n: number) => void) {
                    const fn = typeof opts === "function" ? (opts as (row: ReturnType<typeof mkRow>, n: number) => void) : cb!;
                    fn(mkRow(["Fecha", "Concepto", "Entrada", "Salida", "Categoría"]), 1);
                    fn(mkRow(["2024-03-01", "Test Income", 100, 0, "Ventas"]), 2);
                    fn(mkRow(["2024-03-02", "Test Expense", 0, 50, "Gastos"]), 3);
                },
            },
        ];
        xlsx = { load: vi.fn(async () => undefined) };
    }
    return {
        __esModule: true,
        default: { Workbook: MockWorkbook },
    };
});

vi.mock("xlsx", () => ({
    utils: {
        json_to_sheet: vi.fn(),
        book_new: vi.fn(),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
}));

describe("Finance XLSX Utilities", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("exportToXLSX", () => {
        it("should call XLSX functions with correct data", () => {
            const mockData = [
                { date: "2024-03-01", concept: "Test", amount: 100, type: "INCOME", petty_cash_categories: { name: "Cat1" } },
            ] as any;
            exportToXLSX(mockData, "test-file");
            expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
            expect(XLSX.writeFile).toHaveBeenCalled();
        });
    });

    describe("parseLegacyExcel", () => {
        it("should parse legacy multi-sheet Excel correctly", async () => {
            const { parseLegacyExcel } = await import("@/lib/finance/import-xlsx");
            const mockFile = { name: "test.xlsx", size: 1024, arrayBuffer: async () => new ArrayBuffer(8) } as any;
            const mockOrgs = { LEC: "org-id-1" };
            const mockCats = { Ventas: "cat-id-1", Gastos: "cat-id-2" };

            const result: any = await parseLegacyExcel(mockFile, mockOrgs, mockCats);

            expect(result).toHaveLength(2);
            expect(result[0].concept).toBe("Test Income");
            expect(result[1].type).toBe("EXPENSE");
        });
    });
});
