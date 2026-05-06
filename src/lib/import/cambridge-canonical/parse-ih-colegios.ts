import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import { cellToIsoDate, spanishOrLooseDateToIso } from "./dates";

/** Año del ciclo en planificación IH (UNOi 2025–2026 → fechas sueltas sin año). */
const PLANNING_YEAR = 2026;
import { ihExamLabelToExamType } from "./exam-labels";
import type { IHApplicationRecord } from "./types";

const SHEET = "Colegios_Propuestas_Fechas";

/** Pairs: [countCol, dateCol] relative to header row cells. */
function examPairsFromHeader(header: string[]): { label: string; countIdx: number; dateIdx: number }[] {
    const pairs: { label: string; countIdx: number; dateIdx: number }[] = [];
    for (let i = 0; i < header.length - 1; i++) {
        const a = String(header[i] ?? "").trim();
        const b = String(header[i + 1] ?? "").trim().toUpperCase();
        if (!a || a === "PROPUESTA") break;
        if (b === "FECHA" || b.startsWith("FECHA")) {
            const label = a;
            if (["CITY", "PROYECTO", "COLEGIO", "NIVEL"].includes(label.toUpperCase())) continue;
            pairs.push({ label, countIdx: i, dateIdx: i + 1 });
            i++;
        }
    }
    return pairs;
}

export function parseIHColegiosWorkbook(wb: WorkBook): IHApplicationRecord[] {
export function parseIHColegiosWorkbook(wb: WorkBook, planningYear = new Date().getFullYear()): IHApplicationRecord[] {
    const sh = wb.Sheets[SHEET];
    if (!sh) {
        throw new Error(`Missing sheet "${SHEET}" in IH workbook`);
    }
    const rows = XLSX.utils.sheet_to_json<string[]>(sh, { header: 1, defval: "" }) as string[][];
    let headerRow = -1;
    let header: string[] = [];
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (row && String(row[0] ?? "").trim().toUpperCase() === "CITY") {
            headerRow = r;
            header = row.map((c) => String(c ?? "").trim());
            break;
        }
    }
    if (headerRow < 0) {
        throw new Error(`Could not find CITY header row in ${SHEET}`);
    }

    const pairs = examPairsFromHeader(header);
    const propIdx = header.findIndex((h) => h.toUpperCase() === "PROPUESTA");
    const estIdx = header.findIndex((h) => h.toUpperCase() === "ESTATUS");
    const resIdx = header.findIndex((h) => h.toUpperCase() === "RESULTADOS");

    const out: IHApplicationRecord[] = [];

    for (let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every((c) => String(c ?? "").trim() === "")) continue;
        const colegio = String(row[2] ?? "").trim();
        if (!colegio) continue;

        const city = String(row[0] ?? "").trim();
        const proyecto = String(row[1] ?? "").trim();
        const nivel = String(row[3] ?? "").trim();
        const propuesta = propIdx >= 0 ? String(row[propIdx] ?? "").trim() : "";
        const estatus = estIdx >= 0 ? String(row[estIdx] ?? "").trim() : "";
        const resultados = resIdx >= 0 ? String(row[resIdx] ?? "").trim() : "";

        for (const { label, countIdx, dateIdx } of pairs) {
            const rawCount = row[countIdx];
            const rawDate = row[dateIdx];
            const countStr = String(rawCount ?? "").trim();
            if (!countStr) continue;
            const studentCount = Number(countStr);
            if (!Number.isFinite(studentCount) || studentCount <= 0) continue;

            const examType = ihExamLabelToExamType(label);
            if (!examType) continue;

            const dateRaw = String(rawDate ?? "").trim();
            const dateIso = cellToIsoDate(rawDate) ?? spanishOrLooseDateToIso(dateRaw, PLANNING_YEAR);
            const dateIso = cellToIsoDate(rawDate) ?? spanishOrLooseDateToIso(dateRaw, planningYear);

            out.push({
                city,
                proyecto,
                colegio,
                nivel,
                examLabel: label,
                examType,
                studentCount,
                dateIso,
                dateRaw,
                propuesta,
                estatus,
                resultados,
                rowIndex: r + 1,
            });
        }
    }

    return out;
}

export function readIHWorkbookFromPath(path: string): WorkBook {
    return XLSX.readFile(path, { cellDates: true });
}

export { SHEET as IH_COLEGIOS_SHEET_NAME };
