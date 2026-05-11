import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";

/** Hard ceiling for any `.xls` / `.xlsx` uploaded through the app (server or client). */
export const XLSX_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** Stricter limit for server-side Excel imports (Sprint A5 — payments, legacy caja). */
export const EXCEL_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

const MAX_SHEETS = 30;
/** Per-sheet row span from `!ref`; blocks pathological workbooks before heavy `sheet_to_json`. */
const MAX_SHEET_ROWS = 100_000;

export type XlsxGuardResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export function guardXlsxBuffer(buffer: Buffer): XlsxGuardResult {
  if (buffer.length === 0) {
    return { ok: false, status: 400, message: "Empty file" };
  }
  if (buffer.length > XLSX_UPLOAD_MAX_BYTES) {
    const mb = XLSX_UPLOAD_MAX_BYTES / (1024 * 1024);
    return {
      ok: false,
      status: 413,
      message: `El archivo supera el máximo permitido (${mb} MB) para importación en línea`,
    };
  }
  return { ok: true };
}

export function guardExcelImportBuffer(buffer: Buffer): XlsxGuardResult {
  if (buffer.length === 0) {
    return { ok: false, status: 400, message: "Empty file" };
  }
  if (buffer.length > EXCEL_IMPORT_MAX_BYTES) {
    const mb = EXCEL_IMPORT_MAX_BYTES / (1024 * 1024);
    return {
      ok: false,
      status: 413,
      message: `El archivo supera el máximo permitido (${mb} MB) para importación`,
    };
  }
  return { ok: true };
}

export function guardExcelImportSize(byteLength: number): XlsxGuardResult {
  if (byteLength === 0) {
    return { ok: false, status: 400, message: "Empty file" };
  }
  if (byteLength > EXCEL_IMPORT_MAX_BYTES) {
    const mb = EXCEL_IMPORT_MAX_BYTES / (1024 * 1024);
    return {
      ok: false,
      status: 413,
      message: `El archivo supera el máximo permitido (${mb} MB) para importación`,
    };
  }
  return { ok: true };
}

/** Browser-side check before `XLSX.read` — returns an error message or `null` if OK. */
export function assertSpreadsheetUserFile(file: File): string | null {
  if (!file.size) return "Archivo vacío";
  if (file.size > XLSX_UPLOAD_MAX_BYTES) {
    const mb = XLSX_UPLOAD_MAX_BYTES / (1024 * 1024);
    return `El archivo supera el máximo permitido (${mb} MB)`;
  }
  return null;
}

export function guardXlsxWorkbookShape(workbook: WorkBook): XlsxGuardResult {
  if (workbook.SheetNames.length > MAX_SHEETS) {
    return {
      ok: false,
      status: 400,
      message: `Demasiadas hojas (${workbook.SheetNames.length}); máximo ${MAX_SHEETS}`,
    };
  }
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const ref = sheet["!ref"];
    if (!ref) continue;
    const range = XLSX.utils.decode_range(ref);
    const rows = range.e.r - range.s.r + 1;
    if (rows > MAX_SHEET_ROWS) {
      return {
        ok: false,
        status: 400,
        message: `La hoja "${name}" es demasiado grande (${rows} filas); máximo ${MAX_SHEET_ROWS}`,
      };
    }
  }
  return { ok: true };
}
