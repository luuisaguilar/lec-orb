import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo/config";
import { mockExamCatalog } from "@/lib/demo/data";

export async function GET() {
    if (DEMO_MODE) {
        return NextResponse.json({
            catalog: mockExamCatalog.filter((e) => !e.deleted_at),
            total: mockExamCatalog.filter((e) => !e.deleted_at).length,
        });
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const { data, error } = await supabase
            .from("exam_catalog")
            .select("*")
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .order("name");

        if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
        return NextResponse.json({ catalog: data || [], total: data?.length || 0 });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
