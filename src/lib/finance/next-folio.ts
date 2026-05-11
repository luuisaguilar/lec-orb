import type { SupabaseClient } from "@supabase/supabase-js";

export type FolioDocType = "QUOTE" | "PO" | "PAYMENT" | "INVOICE";

/** Matches output of fn_next_folio: PREFIX-YEAR-##### */
const STANDARD_FOLIO = /^(COT|OC|PAG|FAC|DOC)-\d{4}-\d{5}$/;

export function isValidStandardFolio(folio: string): boolean {
    return STANDARD_FOLIO.test(folio.trim());
}

export async function resolveFolioForInsert(
    supabase: SupabaseClient,
    orgId: string,
    docType: FolioDocType,
    bodyFolio: string | undefined | null
): Promise<{ folio: string } | { error: string; status: number }> {
    const trimmed = (bodyFolio ?? "").trim();
    if (trimmed) {
        if (!isValidStandardFolio(trimmed)) {
            return {
                error: "Folio inválido: use el formato PREFIJO-AAAA-NNNNN (ej. COT-2026-00001).",
                status: 400,
            };
        }
        return { folio: trimmed };
    }

    const { data, error } = await supabase.rpc("fn_next_folio", {
        p_org_id: orgId,
        p_doc_type: docType,
    });

    if (error) {
        return { error: error.message, status: 500 };
    }
    if (typeof data !== "string" || !data) {
        return { error: "No se pudo generar el folio", status: 500 };
    }
    return { folio: data };
}
