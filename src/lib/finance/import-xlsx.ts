import ExcelJS from "exceljs";
import { sanitizeImportString, worksheetToJsonRecords } from "@/lib/import/exceljs-sheet-json";
import { guardExcelImportSize } from "@/lib/import/xlsx-guard";
import { guardExceljsWorkbook } from "@/lib/import/exceljs-guard";

/**
 * Parses a legacy Excel file with sheets LEC, DISCOVER, URUS.
 * @param file File object from input
 * @param orgs Map of organization names to IDs
 * @param categories Map of category names to IDs
 */
export async function parseLegacyExcel(
    file: File,
    orgs: Record<string, string>,
    categories: Record<string, string>
): Promise<any[]> {
    const sizeGuard = guardExcelImportSize(file.size);
    if (!sizeGuard.ok) {
        throw new Error(sizeGuard.message);
    }

    const arrayBuffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const shapeGuard = guardExceljsWorkbook(workbook);
    if (!shapeGuard.ok) {
        throw new Error(shapeGuard.message);
    }

    const allMovements: any[] = [];
    const expectedSheets = ["LEC", "DISCOVER", "URUS"];

    for (const worksheet of workbook.worksheets) {
        const normalizedSheet = worksheet.name.toUpperCase();
        if (!expectedSheets.includes(normalizedSheet)) continue;

        const json: any[] = worksheetToJsonRecords(worksheet);

        const movements = json
            .map((row) => {
                const type = row.Entrada > 0 ? "INCOME" : "EXPENSE";
                const amount = type === "INCOME" ? row.Entrada : row.Salida;

                const catKey = String(row.Categoría ?? "").trim();
                return {
                    org_id: orgs[normalizedSheet],
                    concept: sanitizeImportString(row.Concepto, 2000),
                    categoryName: catKey,
                    category_id: categories[catKey],
                    amount: Number(amount),
                    date: row.Fecha,
                    type,
                };
            })
            .filter((m) => m.concept && m.amount > 0);

        allMovements.push(...movements);
    }

    return allMovements;
}
