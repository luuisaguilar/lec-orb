import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import * as xlsx from "xlsx";

type PaymentConceptRow = {
    concept_key: string;
    description: string | null;
};

type PaymentExportRow = {
    folio: string;
    status: string;
    first_name: string | null;
    last_name: string | null;
    person_name: string | null;
    payment_concepts: PaymentConceptRow | null;
    custom_concept: string | null;
    created_at: string;
    amount: number;
    payment_method: string | null;
    location: string | null;
};

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

    const excelData = ((payments ?? []) as PaymentExportRow[]).map((payment) => ({
        "ID": payment.folio,
        "ST.": mapStatusToExcel(payment.status),
        "NOMBRE COMPLETO": payment.first_name ? `${payment.first_name} ${payment.last_name || ""}`.trim() : payment.person_name,
        "REFERENCIA": payment.folio,
        "CONCEPTO": payment.payment_concepts?.description || payment.custom_concept || "Desconocido",
        "FECHA GEN.": new Date(payment.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" }),
        "TOTAL": payment.amount,
        "PAGO EN": payment.payment_method || "N/A",
        "SEDE": payment.location || "N/A"
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
