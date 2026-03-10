import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const { error } = await supabase
        .from("schools")
        .update(body)
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "schools", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("schools")
        .delete()
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "schools", action: "delete" });
