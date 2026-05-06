/**
 * Export payroll lines from LOGISTICA_UNOi regional sheets (Personal / Actividad / Tarifa / Subtotal).
 *
 * Usage:
 *   npx tsx scripts/export-logistica-payroll-lines.ts "C:/path/LOGISTICA_UNOi 2026.xlsx"
 *   npx tsx scripts/export-logistica-payroll-lines.ts "./book.xlsx" > payroll-lines.json
 */

import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { parseLogisticaPayrollLinesFromWorkbook } from "../src/lib/import/cambridge-canonical/parse-logistica-payroll-lines";

const path = process.argv[2];
if (!path) {
    console.error('Usage: npx tsx scripts/export-logistica-payroll-lines.ts "<path-to.xlsx>"');
    process.exit(1);
}

if (!fs.existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(1);
}

const wb = XLSX.readFile(path, { cellDates: true });
const lines = parseLogisticaPayrollLinesFromWorkbook(wb);

const bySheet: Record<string, number> = {};
for (const line of lines) {
    bySheet[line.sheetName] = (bySheet[line.sheetName] ?? 0) + 1;
}

console.log(
    JSON.stringify(
        {
            sourceFile: path,
            totalLines: lines.length,
            linesBySheet: bySheet,
            lines,
        },
        null,
        2
    )
);
