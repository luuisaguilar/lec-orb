import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    // 1. Get member details
    const { data: member, error: memberError } = await supabase
        .from('org_members')
        .select('*')
        .eq('id', id)
        .single();

    if (memberError || !member) {
        return NextResponse.json({ error: "Member not found", details: memberError?.message }, { status: 404 });
    }

    // 1.5 Get profile manually because foreign key links to auth.users, not profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', member.user_id)
        .single();

    // 2. Get module access
    const { data: access } = await supabase
        .from('member_module_access')
        .select('*')
        .eq('member_id', id);

    return NextResponse.json({
        member: {
            ...member,
            full_name: profile?.full_name || 'Desconocido'
        },
        access: access || []
    });
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const body = await request.json();
    const supabase = await createClient();
    const { id } = await params;

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    const { data: caller } = await supabase
        .from('org_members')
        .select('role, org_id')
        .eq('user_id', user?.id)
        .single();

    if (caller?.role !== 'admin') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Update Role, Location & Job Title
    const updates: any = {};
    if (body.role) updates.role = body.role;
    if (body.location !== undefined) updates.location = body.location; // allowed to be null
    if (body.job_title !== undefined) updates.job_title = body.job_title; // allowed to be null

    if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
            .from('org_members')
            .update(updates)
            .eq('id', id);

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Update Permissions (Matrix)
    if (body.permissions && Array.isArray(body.permissions)) {
        // Simple strategy: delete and re-insert for the member
        // In a real high-traffic app we might do upserts or diffs
        await supabase
            .from('member_module_access')
            .delete()
            .eq('member_id', id);

        if (body.permissions.length > 0) {
            const inserts = body.permissions.map((p: any) => ({
                org_id: caller.org_id,
                member_id: id,
                module: p.module,
                can_view: p.can_view ?? true,
                can_edit: p.can_edit ?? false,
                can_delete: p.can_delete ?? false
            }));

            const { error: insError } = await supabase
                .from('member_module_access')
                .insert(inserts);

            if (insError) return NextResponse.json({ error: insError.message }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true });
}
