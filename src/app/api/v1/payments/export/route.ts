import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import * as xlsx from "xlsx";

function mapStatusToExcel(status: string) {
    switch (status) {
        case "PENDING": return "STPE";
        case "PAID": return "STPA";
        case "CANCELLED": return "STCA";
        case "EXPIRED": return "STVE";
        default: return status;
    }
}

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: payments, error } = await supabase
        .from("payments")
        .select("*, payment_concepts(concept_key, description)")
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;

    const excelData = (payments || []).map((p: {
        folio: string;
        status: string;
        first_name?: string | null;
        last_name?: string | null;
        person_name?: string | null;
        payment_concepts?: { description?: string | null } | null;
        custom_concept?: string | null;
        created_at: string;
        amount: number;
        payment_method?: string | null;
        location?: string | null;
    }) => ({
        "ID": p.folio,
        "ST.": mapStatusToExcel(p.status),
        "NOMBRE COMPLETO": p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : p.person_name,
        "REFERENCIA": p.folio,
        "CONCEPTO": p.payment_concepts?.description || p.custom_concept || "Desconocido",
        "FECHA GEN.": new Date(p.created_at).toLocaleDateString("es-MX", { year: 'numeric', month: '2-digit', day: '2-digit' }),
        "TOTAL": p.amount,
        "PAGO EN": p.payment_method || "N/A",
        "SEDE": p.location || "N/A"
    }));

    const worksheet = xlsx.utils.json_to_sheet(excelData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Pagos");
    const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="Pagos_Export_${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
    });
}, { module: "finanzas", action: "view" });
