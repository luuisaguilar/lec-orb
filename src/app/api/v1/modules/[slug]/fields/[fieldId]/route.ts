import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ slug: string; fieldId: string }>;
}

const updateFieldSchema = z.object({
    label: z.string().min(1).max(100).optional(),
    is_required: z.boolean().optional(),
    default_value: z.string().nullable().optional(),
    options: z.record(z.string(), z.any()).optional(),
    sort_order: z.number().int().min(0).optional(),
    show_in_list: z.boolean().optional(),
    is_searchable: z.boolean().optional(),
    validation: z.record(z.string(), z.any()).optional(),
}).strict();

// PATCH /api/v1/modules/[slug]/fields/[fieldId]
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { slug, fieldId } = await params;
        const body = await request.json();
        const parsed = updateFieldSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();
        if (!member || member.role !== "admin") {
            return NextResponse.json({ error: "Only admins can edit fields" }, { status: 403 });
        }

        const { data: module } = await supabase
            .from("module_registry")
            .select("id, is_native")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .single();
        if (!module || module.is_native) {
            return NextResponse.json({ error: "Module not found or is native" }, { status: 404 });
        }

        const { data: field, error } = await supabase
            .from("module_fields")
            .update(parsed.data)
            .eq("id", fieldId)
            .eq("module_id", module.id)
            .select()
            .single();

        if (error || !field) return NextResponse.json({ error: "Field not found" }, { status: 404 });
        return NextResponse.json({ field });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/v1/modules/[slug]/fields/[fieldId]
export async function DELETE(_request: Request, { params }: RouteParams) {
    try {
        const { slug, fieldId } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();
        if (!member || member.role !== "admin") {
            return NextResponse.json({ error: "Only admins can delete fields" }, { status: 403 });
        }

        const { data: module } = await supabase
            .from("module_registry")
            .select("id, is_native")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .single();
        if (!module || module.is_native) {
            return NextResponse.json({ error: "Module not found or is native" }, { status: 404 });
        }

        const { error } = await supabase
            .from("module_fields")
            .delete()
            .eq("id", fieldId)
            .eq("module_id", module.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}
