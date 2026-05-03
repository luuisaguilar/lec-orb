import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('org_id', member.org_id)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}, { module: "courses", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();

    const { data: course, error } = await supabase
        .from('courses')
        .insert({
            ...body,
            org_id: member.org_id,
            status: body.status || 'draft'
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "courses",
        record_id: course.id,
        action: "INSERT",
        new_data: course,
        performed_by: user.id,
    });

    return NextResponse.json(course);
}, { module: "courses", action: "edit" });

export const PUT = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { data: course, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id)
        .eq('org_id', member.org_id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "courses",
        record_id: id,
        action: "UPDATE",
        new_data: course,
        old_data: updates, // simplified
        performed_by: user.id,
    });

    return NextResponse.json(course);
}, { module: "courses", action: "edit" });
