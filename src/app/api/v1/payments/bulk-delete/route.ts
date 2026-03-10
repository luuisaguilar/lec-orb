import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const POST = withAuth(async (req, { supabase, member }) => {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "No ids provided" }, { status: 400 });

    const { error } = await supabase
        .from("payments")
        .update({ is_active: false }) // standardizing on soft delete if suitable, or delete if requested
        .in("id", ids)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true, count: ids.length });
}, { module: "finanzas", action: "delete" });
