/**
 * OOPT consolidated PDF → one PDF per student, with filenames from TableData.xls when available.
 * Ported from `Agente PDF asignar nombres/app.py` (Flask) for use inside LEC Orb API routes.
 */
import "server-only";

import { load } from "cheerio";
import { extractText } from "unpdf";
import { PDFDocument } from "pdf-lib";
import { format, isValid, parse } from "date-fns";
import { enGB } from "date-fns/locale";
import { normalizePdfInputBytes } from "@/lib/oopt-pdf-validate";

export type TableStudent = {
    last_name: string;
    first_name: string;
    full_name: string;
    username: string;
    score: string;
    time_taken: string;
    cef: string;
    date_taken: string;
    status: string;
    ue_score: string;
    ue_time: string;
    ue_cef: string;
    li_score: string;
    li_time: string;
    li_cef: string;
};

export type OoptSplitRow = {
    page: number;
    original_name: string;
    final_name: string;
    level: string;
    score: string;
    date: string;
    filename: string;
    source: "table" | "pdf";
    status: "ok";
    ue_score: string;
    ue_cef: string;
    li_score: string;
    li_cef: string;
    pdfBase64: string;
};

export type OoptSplitError = {
    page: number;
    name: string;
    error: string;
};

export type OoptSplitResponse = {
    total_pages: number;
    processed: number;
    errors: number;
    results: OoptSplitRow[];
    error_details: OoptSplitError[];
};

export function parseTableDataXls(fileContent: string): TableStudent[] {
    const $ = load(fileContent);
    const students: TableStudent[] = [];

    $("tr.GridItemStyle, tr.GridAlternatingItemStyle").each((_, row) => {
        const cells = $(row).find("td").toArray();
        if (cells.length < 8) return;

        const cellText = (i: number) => $(cells[i]).text().trim();

        const last_name = cellText(0);
        const first_name = cellText(1);
        const username = cellText(2);
        const score = cellText(3);
        const time_taken = cellText(4);
        const cef = cellText(5);
        const date_taken = cellText(6);
        const status = cellText(7);
        const ue_score = cells.length > 8 ? cellText(8) : "";
        const ue_time = cells.length > 9 ? cellText(9) : "";
        const ue_cef = cells.length > 10 ? cellText(10) : "";
        const li_score = cells.length > 11 ? cellText(11) : "";
        const li_time = cells.length > 12 ? cellText(12) : "";
        const li_cef = cells.length > 13 ? cellText(13) : "";

        students.push({
            last_name,
            first_name,
            full_name: `${first_name} ${last_name}`,
            username,
            score,
            time_taken,
            cef,
            date_taken,
            status,
            ue_score,
            ue_time,
            ue_cef,
            li_score,
            li_time,
            li_cef,
        });
    });

    return students;
}

export function extractStudentFromPageText(rawText: string): {
    name: string;
    score: string;
    level: string;
    date: string;
} {
    const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    const data = { name: "DESCONOCIDO", score: "N/A", level: "N/A", date: "N/A" };
    const scoreLine = /^(\d+)\s+([A-Z]\d)\s+\d{1,3}:\d{2}/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const resMatch = line.match(scoreLine);
        if (resMatch && i >= 3) {
            const dateLine = lines[i - 1];
            if (dateLine.includes("202") || dateLine.includes("203")) {
                data.score = resMatch[1];
                data.level = resMatch[2];
                data.date = dateLine;
                data.name = lines[i - 3];
                break;
            }
        }
    }

    return data;
}

export function matchStudentToTable(pdfName: string, tableStudents: TableStudent[]): TableStudent | null {
    const pdfNameLower = pdfName.toLowerCase().trim();

    for (const student of tableStudents) {
        const fullFromTable = `${student.first_name} ${student.last_name}`.toLowerCase();
        const reversedName = `${student.last_name} ${student.first_name}`.toLowerCase();

        if (pdfNameLower === fullFromTable || pdfNameLower === reversedName) {
            return student;
        }

        const lastLower = student.last_name.toLowerCase();
        const firstLower = student.first_name.toLowerCase();
        if (pdfNameLower.includes(lastLower) && pdfNameLower.includes(firstLower)) {
            return student;
        }
    }

    return null;
}

export function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, "");
}

export function formatDateForFilename(dateStr: string): string {
    const trimmed = dateStr.trim();

    const tryPatterns = ["dd/MM/yyyy", "d/M/yyyy", "dd/M/yyyy", "d/MM/yyyy"];
    for (const p of tryPatterns) {
        try {
            const d = parse(trimmed, p, new Date());
            if (isValid(d)) return format(d, "yyyy-MM-dd");
        } catch {
            /* continue */
        }
    }

    try {
        const clean = trimmed.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
        const d = parse(clean, "d MMMM yyyy", new Date(), { locale: enGB });
        if (isValid(d)) return format(d, "yyyy-MM-dd");
    } catch {
        /* fall through */
    }

    return trimmed.replace(/[/\\]/g, "-");
}

export async function processOoptPdfSplit(
    pdfBytes: Uint8Array,
    xlsUtf8: string | null,
    options?: { pdfFileName?: string }
): Promise<OoptSplitResponse> {
    const normalized = normalizePdfInputBytes(pdfBytes, options?.pdfFileName ?? "documento.pdf");
    const tableStudents = xlsUtf8 ? parseTableDataXls(xlsUtf8) : [];

    const forText = Uint8Array.from(normalized);
    const { text: pageTexts } = await extractText(forText, { mergePages: false });
    const totalPages = pageTexts.length;

    const forStructure = Uint8Array.from(normalized);
    const srcDoc = await PDFDocument.load(forStructure, { ignoreEncryption: true });

    const results: OoptSplitRow[] = [];
    const error_details: OoptSplitError[] = [];

    for (let i = 0; i < totalPages; i++) {
        const pageText = pageTexts[i] ?? "";
        const pdfData = extractStudentFromPageText(pageText);

        let matched: TableStudent | null = null;
        if (tableStudents.length > 0) {
            matched = matchStudentToTable(pdfData.name, tableStudents);
        }

        let final_name: string;
        let final_level: string;
        let final_score: string;
        let final_date: string;
        let source: "table" | "pdf";
        let ue_score = "";
        let ue_cef = "";
        let li_score = "";
        let li_cef = "";

        if (matched) {
            final_name = `${matched.first_name} ${matched.last_name}`;
            final_level = matched.cef;
            final_score = matched.score;
            final_date = formatDateForFilename(matched.date_taken);
            source = "table";
            ue_score = matched.ue_score ?? "";
            ue_cef = matched.ue_cef ?? "";
            li_score = matched.li_score ?? "";
            li_cef = matched.li_cef ?? "";
        } else {
            final_name = pdfData.name;
            final_level = pdfData.level;
            final_score = pdfData.score;
            final_date = formatDateForFilename(pdfData.date);
            source = "pdf";
        }

        const newFilename = sanitizeFilename(`${final_name} ${final_level} ${final_date}.pdf`);

        try {
            const outDoc = await PDFDocument.create();
            const [copied] = await outDoc.copyPages(srcDoc, [i]);
            outDoc.addPage(copied);
            const singlePdfBytes = await outDoc.save();
            const pdfBase64 = Buffer.from(singlePdfBytes).toString("base64");

            results.push({
                page: i + 1,
                original_name: pdfData.name,
                final_name,
                level: final_level,
                score: final_score,
                date: final_date,
                filename: newFilename,
                source,
                status: "ok",
                ue_score,
                ue_cef,
                li_score,
                li_cef,
                pdfBase64,
            });
        } catch (e: any) {
            error_details.push({
                page: i + 1,
                name: pdfData.name,
                error: e?.message ?? String(e),
            });
        }
    }

    return {
        total_pages: totalPages,
        processed: results.length,
        errors: error_details.length,
        results,
        error_details,
    };
}
