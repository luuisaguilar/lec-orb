import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { slug, recordId } = await params;

    const { data: module } = await supabase
        .from("module_registry")
        .select("id")
        .eq("slug", slug)
        .or(`org_id.is.null,org_id.eq.${member.org_id}`)
        .eq("is_active", true)
        .single();
    
    if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

    // Permission check (admins always can view)
    if (member.role !== "admin") {
        const { data: perm } = await supabase
            .from("module_permissions")
            .select("can_view")
            .eq("module_id", module.id)
            .eq("role", member.role)
            .single();
        if (!perm?.can_view) {
            return NextResponse.json({ error: "Insufficient permissions to view" }, { status: 403 });
        }
    }

    const { data: record, error } = await supabase
        .from("module_records")
        .select("*")
        .eq("id", recordId)
        .eq("module_id", module.id)
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .single();

    if (error || !record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
    return NextResponse.json({ record });
}, { module: "studio", action: "view" });

const updateRecordSchema = z.object({ data: z.record(z.string(), z.any()) });

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { slug, recordId } = await params;
    const body = await req.json();
    const parsed = updateRecordSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const { data: module } = await supabase.from("module_registry").select("id").eq("slug", slug).or(`org_id.is.null,org_id.eq.${member.org_id}`).eq("is_active", true).single();
    if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

    if (member.role !== "admin") {
        const { data: perm } = await supabase.from("module_permissions").select("can_edit").eq("module_id", module.id).eq("role", member.role).single();
        if (!perm?.can_edit) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { data: existing } = await supabase.from("module_records").select("data").eq("id", recordId).eq("org_id", member.org_id).single();
    if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    const { data: updated, error } = await supabase.from("module_records").update({
        data: { ...(existing.data as Record<string, any>), ...parsed.data.data },
        updated_by: user.id
    }).eq("id", recordId).eq("module_id", module.id).eq("org_id", member.org_id).select().single();

    if (error) throw error;
    
    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "module_records",
        record_id: recordId,
        action: "UPDATE",
        old_data: existing.data,
        new_data: updated,
        performed_by: user.id,
    });
    return NextResponse.json({ record: updated });
}, { module: "studio", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { slug, recordId } = await params;
    const { data: module } = await supabase.from("module_registry").select("id").eq("slug", slug).or(`org_id.is.null,org_id.eq.${member.org_id}`).single();
    if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

    if (!["admin", "supervisor"].includes(member.role)) {
        const { data: perm } = await supabase.from("module_permissions").select("can_delete").eq("module_id", module.id).eq("role", member.role).single();
        if (!perm?.can_delete) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { error } = await supabase.from("module_records").update({ is_active: false }).eq("id", recordId).eq("module_id", module.id).eq("org_id", member.org_id);
    if (error) throw error;
    
    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "module_records",
        record_id: recordId,
        action: "DELETE",
        new_data: { is_active: false },
        performed_by: user.id,
    });
    return NextResponse.json({ success: true });
}, { module: "studio", action: "delete" });
