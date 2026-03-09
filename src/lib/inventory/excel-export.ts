import * as XLSX from "xlsx";
import type { DictionaryKey } from "@/lib/i18n/dictionaries/es-MX";

interface Pack {
    id: string;
    codigo: string;
    nombre: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export function exportPacksToExcel(
    packs: Pack[],
    t: (key: DictionaryKey) => string
) {
    if (!packs || packs.length === 0) return;

    const data = packs.map((pack) => ({
        CODIGO: pack.codigo,
        "SPEAKING PACK TEST": pack.nombre,
        ESTATUS: pack.status === "EN_SITIO" ? t("inventory.statusOnSite") : t("inventory.statusLoaned"),
        NOTAS: pack.notes || "",
        "FECHA REGISTRO": new Date(pack.created_at).toLocaleDateString(),
        "ULTIMA ACTUALIZACION": new Date(pack.updated_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");

    // Auto-fit column widths
    const colWidths = Object.keys(data[0]).map((key) => ({
        wch: Math.max(
            key.length,
            ...data.map((row) => String(row[key as keyof typeof row]).length)
        ) + 2,
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(
        wb,
        `inventario_speaking_packs_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
}
