import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const updateFieldSchema = z.object({
    label: z.string().optional(),
    is_required: z.boolean().optional(),
    options: z.record(z.string(), z.any()).optional(),
    sort_order: z.number().optional(),
});

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { slug, fieldId } = await params;
    const body = await req.json();
    const parsed = updateFieldSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    if (member.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: module } = await supabase.from("module_registry").select("id, is_native").eq("slug", slug).or(`org_id.is.null,org_id.eq.${member.org_id}`).single();
    if (!module || module.is_native) return NextResponse.json({ error: "Module not found or native" }, { status: 404 });

    const { data: field, error } = await supabase.from("module_fields").update(parsed.data).eq("id", fieldId).eq("module_id", module.id).select().single();
    if (error || !field) return NextResponse.json({ error: "Field not found" }, { status: 404 });
    return NextResponse.json({ field });
}, { module: "studio", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { slug, fieldId } = await params;
    if (member.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: module } = await supabase.from("module_registry").select("id, is_native").eq("slug", slug).or(`org_id.is.null,org_id.eq.${member.org_id}`).single();
    if (!module || module.is_native) return NextResponse.json({ error: "Module not found or native" }, { status: 404 });

    const { error } = await supabase.from("module_fields").delete().eq("id", fieldId).eq("module_id", module.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "studio", action: "edit" }); // Using 'edit' action for schema changes
