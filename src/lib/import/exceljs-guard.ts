import type { Workbook } from "exceljs";
import type { XlsxGuardResult } from "./xlsx-guard";

const MAX_SHEETS = 30;
const MAX_SHEET_ROWS = 100_000;

export function guardExceljsWorkbook(wb: Workbook): XlsxGuardResult {
    if (wb.worksheets.length > MAX_SHEETS) {
        return {
            ok: false,
            status: 400,
            message: `Demasiadas hojas (${wb.worksheets.length}); máximo ${MAX_SHEETS}`,
        };
    }
    for (const ws of wb.worksheets) {
        const rows = ws.rowCount;
        if (rows > MAX_SHEET_ROWS) {
            return {
                ok: false,
                status: 400,
                message: `La hoja "${ws.name}" es demasiado grande (${rows} filas); máximo ${MAX_SHEET_ROWS}`,
            };
        }
    }
    return { ok: true };
}
