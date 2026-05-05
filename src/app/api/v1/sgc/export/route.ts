import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import * as xlsx from "xlsx";

export const GET = withAuth(async (req, { supabase, member, user }) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "audits"; // audits or reviews

    let data: any[] = [];
    let fileName = "";
    let sheetName = "";

    if (type === "audits") {
        const { data: audits, error } = await supabase
            .from("sgc_audits")
            .select("*")
            .eq("org_id", member.org_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch manager names separately since relationship might not be formal in DB
        const managerIds = Array.from(new Set(audits?.map((a: { audit_manager_id: string }) => a.audit_manager_id).filter(Boolean) || []));
        let managerMap = new Map();
        if (managerIds.length > 0) {
            const { data: managers } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", managerIds);
            if (managers) {
                managerMap = new Map(managers.map((m: { id: string; full_name: string }) => [m.id, m.full_name]));
            }
        }
        
        data = (audits || []).map((a: { ref: string; title: string; audit_date: string | null; state: string; audit_manager_id: string; created_at: string }) => ({
            "Referencia": a.ref,
            "Título": a.title,
            "Fecha": a.audit_date ? new Date(a.audit_date).toLocaleDateString("es-MX") : "N/A",
            "Estado": a.state === 'open' ? 'Abierta' : a.state === 'closed' ? 'Cerrada' : a.state,
            "Auditor Líder": managerMap.get(a.audit_manager_id) || "N/A",
            "Creado el": new Date(a.created_at).toLocaleDateString("es-MX")
        }));
        fileName = `Auditorias_SGC_${new Date().toISOString().split('T')[0]}.xlsx`;
        sheetName = "Auditorías";
    } else if (type === "reviews") {
        const { data: reviews, error } = await supabase
            .from("sgc_reviews")
            .select("*")
            .eq("org_id", member.org_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch creator names
        const creatorIds = Array.from(new Set(reviews?.map((r: { created_by: string }) => r.created_by).filter(Boolean) || []));
        let creatorMap = new Map();
        if (creatorIds.length > 0) {
            const { data: creators } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", creatorIds);
            if (creators) {
                creatorMap = new Map(creators.map((c: { id: string; full_name: string }) => [c.id, c.full_name]));
            }
        }

        data = (reviews || []).map((r: { ref: string; title: string; review_date: string | null; state: string; created_by: string; created_at: string }) => ({
            "Referencia": r.ref,
            "Título": r.title,
            "Fecha": r.review_date ? new Date(r.review_date).toLocaleDateString("es-MX") : "N/A",
            "Estado": r.state === 'open' ? 'Abierta' : r.state === 'closed' ? 'Cerrada' : r.state,
            "Creado por": creatorMap.get(r.created_by) || "N/A",
            "Creado el": new Date(r.created_at).toLocaleDateString("es-MX")
        }));
        fileName = `Revisiones_Direccion_${new Date().toISOString().split('T')[0]}.xlsx`;
        sheetName = "Revisiones";
    } else {
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Trazabilidad en audit_logs
    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: type === "audits" ? "sgc_audits" : "sgc_reviews",
        record_id: member.org_id, // Global export context
        action: "EXPORT",
        new_data: { 
            export_type: type, 
            records_count: data.length,
            fileName 
        },
        performed_by: user.id,
    });

    return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${fileName}"`,
        },
    });
}, { module: "sgc", action: "view" });
