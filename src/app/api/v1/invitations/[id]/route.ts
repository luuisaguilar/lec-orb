import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const PATCH = withAuth(async (req, { supabase, member: membership }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    if (membership?.role !== 'admin') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: invitation, error } = await supabase
        .from('org_invitations')
        .update({ status: body.status })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ invitation });
}, { module: "users", action: "edit" });
