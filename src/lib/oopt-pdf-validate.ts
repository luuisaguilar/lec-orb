/**
 * Detect PDF magic (%PDF) and common mis-uploads (HTML, TableData.xls in wrong field).
 * Used by the OOPT API route and the dashboard page (client pre-check).
 */

export function findPdfHeaderOffset(buf: Uint8Array): number {
    const scanLimit = Math.min(buf.byteLength, 262144);
    for (let i = 0; i <= scanLimit - 4; i++) {
        if (buf[i] === 0x25 && buf[i + 1] === 0x50 && buf[i + 2] === 0x44 && buf[i + 3] === 0x46) {
            return i;
        }
    }
    return -1;
}

/**
 * Returns a buffer starting at %PDF, or throws an Error with a Spanish hint.
 */
export function normalizePdfInputBytes(buf: Uint8Array, fileName: string): Uint8Array {
    if (buf.byteLength === 0) {
        throw new Error(
            "El archivo está vacío. Vuelve a elegir el PDF consolidado de resultados Oxford (OOPT)."
        );
    }

    const off = findPdfHeaderOffset(buf);
    if (off >= 0) {
        return off === 0 ? buf : buf.slice(off);
    }

    const preview = new TextDecoder("utf-8", { fatal: false }).decode(
        buf.slice(0, Math.min(600, buf.byteLength))
    );
    const trimmed = preview.trimStart();
    const lower = trimmed.slice(0, 280).toLowerCase();

    if (trimmed.startsWith("<") || lower.includes("<!doctype") || lower.includes("<html")) {
        throw new Error(
            "El archivo no es un PDF: el contenido parece HTML (p. ej. sesión caducada en Oxford o página de error al descargar). Abre el enlace de nuevo, descarga el PDF de resultados y súbelo otra vez."
        );
    }
    if (
        lower.includes("griditemstyle") ||
        lower.includes("gridalternatingitemstyle") ||
        (lower.includes("<table") && lower.includes("grid"))
    ) {
        throw new Error(
            "Parece que subiste el TableData.xls en el campo del PDF. Usa la izquierda solo para el PDF consolidado de Oxford y la derecha para el TableData.xls."
        );
    }

    throw new Error(
        `«${fileName}» no es un PDF reconocible (falta la cabecera %PDF). Comprueba que sea el PDF consolidado de resultados OOPT, no otro tipo de archivo.`
    );
}
