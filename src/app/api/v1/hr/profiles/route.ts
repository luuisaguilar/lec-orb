import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (_req, { supabase, member }) => {
    const { data, error } = await supabase
        .from("hr_profiles")
        .select("id, node_id, role_title, holder_name, area, role_type, mission, responsibilities, requirements, parent_node_id, process_id, last_pdf_path, created_at, updated_at")
        .eq("org_id", member.org_id)
        .order("role_title", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ profiles: data ?? [] });
}, { module: "rrhh", action: "view" });
