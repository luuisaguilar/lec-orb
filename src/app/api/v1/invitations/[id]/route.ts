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
        .eq('org_id', membership.org_id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ invitation });
}, { module: "users", action: "edit" });

// Permanently delete a single invitation (admin only, non-pending only)
export const DELETE = withAuth(async (req, { supabase, member: membership }, { params }) => {
    const { id } = await params;

    if (membership?.role !== 'admin') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Only allow deleting non-pending invitations (can't delete active ones)
    const { error } = await supabase
        .from('org_invitations')
        .delete()
        .eq('id', id)
        .eq('org_id', membership.org_id)
        .neq('status', 'pending');

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "users", action: "edit" });
