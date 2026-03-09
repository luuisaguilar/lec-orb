import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ slug: string; recordId: string }>;
}

// GET /api/v1/modules/[slug]/records/[recordId]
export async function GET(_request: Request, { params }: RouteParams) {
    try {
        const { slug, recordId } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const { data: module } = await supabase
            .from("module_registry")
            .select("id")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .eq("is_active", true)
            .single();
        if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

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
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/v1/modules/[slug]/records/[recordId]
const updateRecordSchema = z.object({ data: z.record(z.string(), z.any()) });

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { slug, recordId } = await params;
        const body = await request.json();
        const parsed = updateRecordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("id, org_id, role")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const { data: module } = await supabase
            .from("module_registry")
            .select("id")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .eq("is_active", true)
            .single();
        if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

        // Permission check
        if (member.role !== "admin") {
            const { data: perm } = await supabase
                .from("module_permissions")
                .select("can_edit")
                .eq("module_id", module.id)
                .eq("role", member.role)
                .single();
            if (!perm?.can_edit) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        // Merge existing data with updated fields (PATCH semantics)
        const { data: existing } = await supabase
            .from("module_records")
            .select("data")
            .eq("id", recordId)
            .eq("org_id", member.org_id)
            .single();
        if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 });

        const mergedData = { ...existing.data, ...parsed.data.data };

        const { data: updated, error } = await supabase
            .from("module_records")
            .update({ data: mergedData, updated_by: user.id })
            .eq("id", recordId)
            .eq("module_id", module.id)
            .eq("org_id", member.org_id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ record: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/v1/modules/[slug]/records/[recordId] (soft delete)
export async function DELETE(_request: Request, { params }: RouteParams) {
    try {
        const { slug, recordId } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const { data: module } = await supabase
            .from("module_registry")
            .select("id")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .single();
        if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

        // Only admins/supervisors can delete
        if (!["admin", "supervisor"].includes(member.role)) {
            const { data: perm } = await supabase
                .from("module_permissions")
                .select("can_delete")
                .eq("module_id", module.id)
                .eq("role", member.role)
                .single();
            if (!perm?.can_delete) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { error } = await supabase
            .from("module_records")
            .update({ is_active: false })
            .eq("id", recordId)
            .eq("module_id", module.id)
            .eq("org_id", member.org_id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}
