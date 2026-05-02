import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (_req, { supabase, member }) => {
    const { data, error } = await supabase
        .from("risk_assessments")
        .select("id, process_id, risk_name, severity, probability, mitigation_plan, status, updated_at, sgc_processes(id, title)")
        .eq("org_id", member.org_id)
        .order("updated_at", { ascending: false });

    if (error) throw error;

    const risks = (data ?? []).map((item: any) => ({
        id: item.id,
        process_id: item.process_id,
        process_title: item.sgc_processes?.title ?? item.process_id ?? "Sin proceso",
        risk_name: item.risk_name,
        severity: item.severity,
        probability: item.probability,
        mitigation_plan: item.mitigation_plan,
        status: item.status,
        updated_at: item.updated_at,
    }));

    return NextResponse.json({ risks });
}, { module: "sgc", action: "view" });
