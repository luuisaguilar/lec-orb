import type { Cell, CellFormulaValue, CellHyperlinkValue, CellRichTextValue } from "exceljs";

/** Strip control chars; cap length for DB / audit safety. */
export function sanitizeImportString(v: unknown, maxLen = 2000): string {
    const s = String(v ?? "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .trim();
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen);
}

export function cellToPlainValue(cell: Cell): unknown {
    const v = cell.value;
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    if (typeof v === "object") {
        if ("richText" in v && Array.isArray((v as CellRichTextValue).richText)) {
            return (v as CellRichTextValue).richText.map((t) => t.text).join("");
        }
        if ("text" in v && typeof (v as CellHyperlinkValue).text === "string") {
            return (v as CellHyperlinkValue).text ?? "";
        }
        if ("result" in v) {
            const r = (v as CellFormulaValue).result;
            return r ?? "";
        }
    }
    return String(v);
}

/**
 * First row = headers (string keys). Following rows = plain objects (Excel column order).
 */
export function worksheetToJsonRecords(worksheet: import("exceljs").Worksheet): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = [];
    let headerKeys: string[] | null = null;

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const len = row.cellCount;
        const cells: unknown[] = [];
        for (let c = 1; c <= len; c++) {
            cells.push(cellToPlainValue(row.getCell(c)));
        }
        while (cells.length > 0 && (cells[cells.length - 1] === "" || cells[cells.length - 1] == null)) {
            cells.pop();
        }

        if (rowNumber === 1) {
            headerKeys = cells.map((h) => sanitizeImportString(h, 500));
            return;
        }
        if (!headerKeys) return;

        const obj: Record<string, unknown> = {};
        headerKeys.forEach((key, i) => {
            if (!key) return;
            const val = cells[i] ?? "";
            obj[key] = typeof val === "string" ? sanitizeImportString(val, 4000) : val;
        });
        out.push(obj);
    });

    return out;
}
