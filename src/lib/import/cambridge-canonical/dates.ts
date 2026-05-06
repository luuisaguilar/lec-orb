import { isValid, parse } from "date-fns";
import { es } from "date-fns/locale";

/** Excel 1900 date serial → YYYY-MM-DD (UTC). */
export function excelSerialToIsoDate(serial: number): string {
    const utcMs = (serial - 25569) * 86400 * 1000;
    return new Date(utcMs).toISOString().slice(0, 10);
}

export function cellToIsoDate(cell: unknown): string | null {
    if (cell === null || cell === undefined || cell === "") return null;
    if (typeof cell === "number" && Number.isFinite(cell)) {
        return excelSerialToIsoDate(cell);
    }
    if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
        return cell.toISOString().slice(0, 10);
    }
    if (typeof cell === "string") {
        const t = cell.trim();
        if (!t) return null;
        const asNum = Number(t);
        if (!Number.isNaN(asNum) && asNum > 30000) {
            return excelSerialToIsoDate(asNum);
        }
    }
    return null;
}

const SPANISH_DATE_FORMATS = [
    "EEEE dd MMM yyyy",
    "EEEE dd 'de' MMMM yyyy",
    "EEE, dd MMM yyyy",
    "EEE, d MMM yyyy",
    "EEE,dd MMM yyyy",
    "EEE dd MMM yyyy",
    "dd MMM yyyy",
    "d MMM yyyy",
    "d MMMM yyyy",
    "dd 'de' MMMM yyyy",
    "d 'de' MMMM yyyy",
    "dd/MM/yyyy",
    "d/M/yyyy",
];

const MONTH_TOKEN_TO_INDEX: Record<string, number> = (() => {
    const pairs: [string, number][] = [
        ["ene", 0],
        ["enero", 0],
        ["feb", 1],
        ["febrero", 1],
        ["mar", 2],
        ["marzo", 2],
        ["abr", 3],
        ["abril", 3],
        ["may", 4],
        ["mayo", 4],
        ["jun", 5],
        ["junio", 5],
        ["jul", 6],
        ["julio", 6],
        ["ago", 7],
        ["agosto", 7],
        ["sep", 8],
        ["sept", 8],
        ["septiembre", 8],
        ["oct", 9],
        ["octubre", 9],
        ["nov", 10],
        ["noviembre", 10],
        ["dic", 11],
        ["diciembre", 11],
    ];
    const m: Record<string, number> = {};
    for (const [k, v] of pairs) {
        m[k.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()] = v;
    }
    return m;
})();

/** "13 MARZO", "11 feb" tras quitar prefijos, etc. */
function regexDayMonthToIso(s: string, defaultYear: number): string | null {
    const folded = s
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
    const re = /\b(\d{1,2})\s+(?:de\s+)?([a-z]{3,12})\b/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(folded)) !== null) {
        const day = Number(match[1]);
        if (day < 1 || day > 31) continue;
        let monKey = match[2];
        if (monKey.length > 3 && !MONTH_TOKEN_TO_INDEX[monKey]) monKey = monKey.slice(0, 3);
        const monthIdx = MONTH_TOKEN_TO_INDEX[monKey] ?? MONTH_TOKEN_TO_INDEX[match[2]];
        if (monthIdx === undefined) continue;
        const d = new Date(Date.UTC(defaultYear, monthIdx, day));
        if (d.getUTCDate() !== day) continue;
        return d.toISOString().slice(0, 10);
    }
    return null;
}

/**
 * Fechas libres en español (p. ej. "sabado 07 feb", "mier, 11 feb", "23 may")
 * y ruido tipo "21 MARZO PAPER- ARRIZON" (toma primer token de fecha).
 */
export function spanishOrLooseDateToIso(raw: string, defaultYear = 2026): string | null {
    let s = raw.trim();
    if (!s) return null;
    if (s.includes("GMT") && s.includes("(")) {
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    s = s.replace(/\s+/g, " ");
    s = s.replace(/,(\d)/g, ", $1");
    const lower = s.toLowerCase();
    const noiseCut = lower.search(/\b(paper|digital|lec|arrizon|arrison|centres|qc)\b/);
    if (noiseCut > 0) {
        s = s.slice(0, noiseCut).trim();
    }
    const ref = new Date(defaultYear, 5, 15);
    const withYear = /\d{4}/.test(s) ? s : `${s} ${defaultYear}`;
    for (const fmt of SPANISH_DATE_FORMATS) {
        const d = parse(withYear, fmt, ref, { locale: es });
        if (isValid(d)) return d.toISOString().slice(0, 10);
    }
    const folded = withYear
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/\s+/g, " ");
    for (const fmt of SPANISH_DATE_FORMATS) {
        const d = parse(folded, fmt, ref, { locale: es });
        if (isValid(d)) return d.toISOString().slice(0, 10);
    }
    const fromRegex = regexDayMonthToIso(s, defaultYear);
    if (fromRegex) return fromRegex;
    return regexDayMonthToIso(folded, defaultYear);
}
