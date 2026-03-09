import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkServerPermission } from "@/lib/auth/permissions";
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

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canView = await checkServerPermission(supabase, user.id, "finanzas", "view");
        if (!canView) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        // Fetch all active payments
        const { data: payments, error } = await supabase
            .from("payments")
            .select("*, payment_concepts(concept_key, description)")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Map to Excel format
        const excelData = (payments || []).map(p => ({
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

        // Generate Workbook
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
