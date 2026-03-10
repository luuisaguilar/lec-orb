import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { slug } = await params;
    const { data: module } = await supabase.from("module_registry").select("id").eq("slug", slug).or(`org_id.is.null,org_id.eq.${member.org_id}`).eq("is_active", true).single();
    if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

    const { data: fields, error } = await supabase.from("module_fields").select("*").eq("module_id", module.id).order("sort_order", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ fields: fields ?? [] });
}, { module: "studio", action: "view" });

const createFieldSchema = z.object({
    name: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/),
    label: z.string().min(1).max(100),
    field_type: z.string(),
    is_required: z.boolean().default(false),
    options: z.record(z.string(), z.any()).default({}),
    sort_order: z.number().int().min(0).default(0),
});

export const POST = withAuth(async (req, { supabase, member }, { params }) => {
    const { slug } = await params;
    const body = await req.json();
    const parsed = createFieldSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    if (member.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: module } = await supabase.from("module_registry").select("id, is_native").eq("slug", slug).or(`org_id.is.null,org_id.eq.${member.org_id}`).eq("is_active", true).single();
    if (!module || module.is_native) return NextResponse.json({ error: "Cannot add fields" }, { status: 400 });

    const { data: field, error } = await supabase.from("module_fields").insert({ ...parsed.data, module_id: module.id }).select().single();
    if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "Field exists" }, { status: 409 });
        throw error;
    }
    return NextResponse.json({ field }, { status: 201 });
}, { module: "studio", action: "edit" });
