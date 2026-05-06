import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import { logisticaOralLabelToExamType } from "./exam-labels";
import type { LogisticaPayrollLineRecord } from "./types";

function norm(s: unknown): string {
    return String(s ?? "").trim();
}

function isVenueTitleRow(row: string[]): boolean {
    const a = norm(row[0]);
    const b = norm(row[1]);
    return a.length > 0 && b.length === 0 && !a.toUpperCase().includes("EVALUAC");
}

/** Column header row for oral/written grid (not the payroll header). */
function isSessionColumnHeaderRow(row: string[]): boolean {
    return norm(row[0]).toLowerCase() === "sede" && norm(row[1]).toLowerCase() === "examen";
}

function parseMoney(raw: unknown): number | null {
    if (raw === "" || raw === null || raw === undefined) return null;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    const s = String(raw)
        .replace(/\u00a0/g, " ")
        .replace(/[$\s]/g, "")
        .replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function parseDurationCell(raw: unknown): { hours: number | null; workDateIso: string | null } {
    if (raw === "" || raw === null || raw === undefined) {
        return { hours: null, workDateIso: null };
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return { hours: raw, workDateIso: null };
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return { hours: null, workDateIso: raw.toISOString().slice(0, 10) };
    }
    const s = String(raw).trim();
    const asNum = Number(s.replace(",", "."));
    if (Number.isFinite(asNum) && /^\d/.test(s)) {
        return { hours: asNum, workDateIso: null };
    }
    return { hours: null, workDateIso: null };
}

/**
 * Map Actividad cell to event_staff-style role (matches run-import.ts conventions).
 */
export function logisticaActivityToRoleCode(activityRaw: string): string | null {
    const u = activityRaw.toUpperCase().replace(/\s+/g, " ");
    if (!u) return null;
    if (u.includes("INVIGILATOR")) return "INVIGILATOR";
    if (u.includes("ADMIN")) return "ADMIN";
    if (u.includes("SUPER")) return "SUPER";
    if (u.startsWith("SE") || u.includes("SE-REMOTO") || u.includes("SE-REMOTA")) return "SE";
    return null;
}

const COL_PERSON = 14;
const COL_ACTIVITY = 15;
const COL_DURATION = 16;
const COL_TARIFF = 17;
const COL_SUBTOTAL = 18;

/**
 * Extract payroll lines from regional logistics layout (Personal / Actividad / Duración / Tarifa / Subtotal).
 * Does not require sessions to parse first; walks the sheet in one pass.
 */
export function parseLogisticaPayrollLinesFromRegionalRows(
    sheetName: string,
    rows: string[][]
): LogisticaPayrollLineRecord[] {
    const out: LogisticaPayrollLineRecord[] = [];
    let venue = "";
    let lastPrimaryRow: string[] | null = null;

    for (let r = 0; r < rows.length; r++) {
        const row = rows[r] ?? [];

        if (isVenueTitleRow(row)) {
            venue = norm(row[0]);
            lastPrimaryRow = null;
            continue;
        }

        if (isSessionColumnHeaderRow(row)) {
            lastPrimaryRow = null;
            const hasPayrollOnHeaderRow =
                norm(row[COL_PERSON]).length > 0 && norm(row[COL_ACTIVITY]).length > 0;
            if (!hasPayrollOnHeaderRow) continue;
        }

        const oralExam = norm(row[1]);
        if (oralExam && oralExam.toLowerCase() !== "examen" && logisticaOralLabelToExamType(oralExam)) {
            lastPrimaryRow = row;
        }

        const personName = norm(row[COL_PERSON]);
        const activityRaw = norm(row[COL_ACTIVITY]);
        if (!personName || !activityRaw) continue;

        const tariff = parseMoney(row[COL_TARIFF]);
        const subtotal = parseMoney(row[COL_SUBTOTAL]);
        if (tariff === null && subtotal === null) continue;

        const { hours, workDateIso } = parseDurationCell(row[COL_DURATION]);
        const roleCode = logisticaActivityToRoleCode(activityRaw);

        const oralCtx = lastPrimaryRow
            ? {
                  oralExamRaw: norm(lastPrimaryRow[1]) || null,
                  writtenExamRaw: norm(lastPrimaryRow[7]) || null,
                  oralDayRaw: norm(lastPrimaryRow[3]) || null,
                  writtenDayRaw: norm(lastPrimaryRow[9]) || null,
              }
            : {
                  oralExamRaw: null,
                  writtenExamRaw: null,
                  oralDayRaw: null,
                  writtenDayRaw: null,
              };

        out.push({
            sheetName,
            venueLabel: venue || "UNKNOWN_VENUE",
            sourceRow: r + 1,
            personName,
            activityRaw,
            roleCode,
            hours,
            workDateIso,
            tariff,
            subtotal,
            ...oralCtx,
        });
    }

    return out;
}

const SKIP_SHEETS = new Set(
    [
        "DURACION",
        "ZOOM",
        "HOJA 2",
        "Hoja 2",
        "MARZO",
        "ABRIL",
        "MAYO",
        "PRESUPUESTO GASTOS",
        "SHEET2",
        "Sheet2",
        "TARIFAS UNOi_2023",
    ].map((s) => s.toUpperCase())
);

const REGIONAL_SHEET_RE = /^(HMO_|OBRE_|HMO-PCO)/i;

export function parseLogisticaPayrollLinesFromWorkbook(wb: WorkBook): LogisticaPayrollLineRecord[] {
    const all: LogisticaPayrollLineRecord[] = [];
    for (const name of wb.SheetNames) {
        if (SKIP_SHEETS.has(name.trim().toUpperCase())) continue;
        if (!REGIONAL_SHEET_RE.test(name)) continue;
        const sh = wb.Sheets[name];
        if (!sh) continue;
        const rows = XLSX.utils.sheet_to_json<string[]>(sh, { header: 1, defval: "" }) as string[][];
        all.push(...parseLogisticaPayrollLinesFromRegionalRows(name, rows));
    }
    return all;
}
