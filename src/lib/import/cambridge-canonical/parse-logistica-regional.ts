import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import { cellToIsoDate, spanishOrLooseDateToIso } from "./dates";

const LOGISTICA_YEAR = 2026;
import { logisticaOralLabelToExamType } from "./exam-labels";
import type { LogisticaSessionRecord } from "./types";

function norm(s: unknown): string {
    return String(s ?? "").trim();
}

function isVenueTitleRow(row: string[]): boolean {
    const a = norm(row[0]);
    const b = norm(row[1]);
    return a.length > 0 && b.length === 0 && !a.toUpperCase().includes("EVALUAC");
}

function isOralHeaderRow(row: string[]): boolean {
    const t = row.map(norm).join(" ");
    return t.includes("EVALUACIÓN ORAL") || t.includes("EVALUACION ORAL");
}

function isColumnHeaderRow(row: string[]): boolean {
    return norm(row[1]).toLowerCase() === "examen" && norm(row[2]).toLowerCase().includes("alumn");
}

/** Rows after a primary block: col B empty until the next oral exam row. */
function continuationEndRow(rows: string[][], startR: number): number {
    let r = startR;
    while (r < rows.length) {
        const row = rows[r];
        const examCell = norm(row[1]);
        if (examCell && logisticaOralLabelToExamType(examCell)) break;
        if (examCell.toLowerCase() === "examen") break;
        r++;
        if (r - startR > 25) break;
    }
    return r;
}

/**
 * Best-effort parser for regional logistics sheets (OBRE_MAYO, HMO_FEB, …).
 * Layout matches exports: venue banner row, oral/written headers, multi-line examiners in col F.
 */
export function parseLogisticaRegionalRows(sheetName: string, rows: string[][]): LogisticaSessionRecord[] {
    const sessions: LogisticaSessionRecord[] = [];
    let venue = "";
    const supervisorAcc: string[] = [];

    for (let r = 0; r < rows.length; r++) {
        const row = rows[r] ?? [];
        const line0 = norm(row[0]);

        if (line0.toUpperCase().includes("SUPERVISOR")) {
            supervisorAcc.push(line0);
        }

        if (isVenueTitleRow(row)) {
            venue = line0;
            continue;
        }

        if (isOralHeaderRow(row)) {
            continue;
        }

        if (isColumnHeaderRow(row)) {
            continue;
        }

        const oralExam = norm(row[1]);
        if (!oralExam || oralExam.toLowerCase() === "examen") continue;

        const oralType = logisticaOralLabelToExamType(oralExam);
        if (!oralType) continue;

        const oralStudentsRaw = norm(row[2]);
        const oralStudents = oralStudentsRaw ? Number(oralStudentsRaw) : null;
        const oralDayRaw = norm(row[3]);
        const oralTimeRange = norm(row[4]);
        const firstExaminer = norm(row[5]);
        const firstStaff = norm(row[11]);
        const endR = continuationEndRow(rows, r + 1);
        const oralExaminers = [firstExaminer];
        const writtenStaff = [firstStaff];
        for (let rr = r + 1; rr < endR; rr++) {
            const e = norm(rows[rr][5]);
            const s = norm(rows[rr][11]);
            if (e && !e.toUpperCase().includes("SUPERVISOR")) oralExaminers.push(e);
            if (s) writtenStaff.push(s);
        }
        const nextR = endR;

        const writtenExam = norm(row[7]);
        const writtenStudentsRaw = norm(row[8]);
        const writtenStudents = writtenStudentsRaw ? Number(writtenStudentsRaw) : null;
        const writtenDayRawCell = row[9];
        const writtenDayRaw = norm(writtenDayRawCell);
        const writtenDayIso =
            cellToIsoDate(writtenDayRawCell) ?? spanishOrLooseDateToIso(writtenDayRaw, LOGISTICA_YEAR);
        const writtenTimeRange = norm(row[10]);

        const writtenType = writtenExam ? logisticaOralLabelToExamType(writtenExam) : null;

        sessions.push({
            sheetName,
            venueLabel: venue || norm(row[0]) || "UNKNOWN_VENUE",
            oralExamRaw: oralExam,
            oralExamType: oralType,
            oralStudents: Number.isFinite(oralStudents) ? oralStudents : null,
            oralDayRaw,
            oralTimeRange,
            oralExaminers,
            writtenExamRaw: writtenExam,
            writtenExamType: writtenType,
            writtenStudents: Number.isFinite(writtenStudents as number) ? writtenStudents : null,
            writtenDayIso,
            writtenDayRaw,
            writtenTimeRange,
            writtenStaff,
            supervisorLabels: [...supervisorAcc],
            sourceRow: r + 1,
        });

        supervisorAcc.length = 0;
        r = Math.max(r, nextR - 1);
    }

    return sessions;
}

export function parseLogisticaWorkbookRegionalSheets(wb: WorkBook): Map<string, LogisticaSessionRecord[]> {
    const bySheet = new Map<string, LogisticaSessionRecord[]>();
    const skip = new Set(
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

    for (const name of wb.SheetNames) {
        if (skip.has(name.trim().toUpperCase())) continue;
        if (!/^(HMO_|OBRE_|HMO-PCO)/i.test(name)) continue;
        const sh = wb.Sheets[name];
        if (!sh) continue;
        const rows = XLSX.utils.sheet_to_json<string[]>(sh, { header: 1, defval: "" }) as string[][];
        bySheet.set(name, parseLogisticaRegionalRows(name, rows));
    }
    return bySheet;
}

export function readLogisticaWorkbookFromPath(path: string): WorkBook {
    return XLSX.readFile(path, { cellDates: true });
}
