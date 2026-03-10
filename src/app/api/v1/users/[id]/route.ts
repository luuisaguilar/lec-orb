import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase }, { params }) => {
    const { id } = await params;

    const { data: member, error: memberError } = await supabase
        .from('org_members')
        .select('*')
        .eq('id', id)
        .single();

    if (memberError || !member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', member.user_id)
        .single();

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
}, { module: "users", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member: caller }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    if (caller?.role !== 'admin') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates: any = {};
    if (body.role) updates.role = body.role;
    if (body.location !== undefined) updates.location = body.location;
    if (body.job_title !== undefined) updates.job_title = body.job_title;

    if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
            .from('org_members')
            .update(updates)
            .eq('id', id);
        if (updateError) throw updateError;
    }

    if (body.permissions && Array.isArray(body.permissions)) {
        await supabase.from('member_module_access').delete().eq('member_id', id);
        if (body.permissions.length > 0) {
            const inserts = body.permissions.map((p: any) => ({
                org_id: caller.org_id,
                member_id: id,
                module: p.module,
                can_view: p.can_view ?? true,
                can_edit: p.can_edit ?? false,
                can_delete: p.can_delete ?? false
            }));
            const { error: insError } = await supabase.from('member_module_access').insert(inserts);
            if (insError) throw insError;
        }
    }

    return NextResponse.json({ success: true });
}, { module: "users", action: "edit" });
