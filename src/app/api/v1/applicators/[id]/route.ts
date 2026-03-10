import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const { error } = await supabase
        .from("applicators")
        .update(body)
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "applicators", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("applicators")
        .delete()
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "applicators", action: "delete" });
