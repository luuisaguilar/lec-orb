import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const search = searchParams.get("search") ?? "";
    const offset = (page - 1) * limit;

    const { data: module } = await supabase
        .from("module_registry")
        .select("id, is_native")
        .eq("slug", slug)
        .or(`org_id.is.null,org_id.eq.${member.org_id}`)
        .eq("is_active", true)
        .single();

    if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });
    if (module.is_native) return NextResponse.json({ error: "Native modules use their own API routes" }, { status: 400 });

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

    let query = supabase
        .from("module_records")
        .select("*", { count: "exact" })
        .eq("module_id", module.id)
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) query = query.ilike("data::text", `%${search}%`);

    const { data: records, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
        records: records ?? [],
        pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) }
    });
}, { module: "studio", action: "view" });

const createRecordSchema = z.object({ data: z.record(z.string(), z.any()) });

export const POST = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { slug } = await params;
    const body = await req.json();
    const parsed = createRecordSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    const { data: module } = await supabase
        .from("module_registry")
        .select("id, is_native")
        .eq("slug", slug)
        .or(`org_id.is.null,org_id.eq.${member.org_id}`)
        .eq("is_active", true)
        .single();

    if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });
    if (module.is_native) return NextResponse.json({ error: "Native modules use their own API routes" }, { status: 400 });

    if (member.role !== "admin") {
        const { data: perm } = await supabase.from("module_permissions").select("can_create").eq("module_id", module.id).eq("role", member.role).single();
        if (!perm?.can_create) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { data: fields } = await supabase.from("module_fields").select("name, label, field_type, is_required").eq("module_id", module.id);
    const incomingData = parsed.data.data;
    const validationErrors: string[] = [];

    for (const field of fields ?? []) {
        if (field.field_type === "formula") continue;
        const val = incomingData[field.name];
        if (field.is_required && (val === null || val === undefined || val === "")) validationErrors.push(`"${field.label}" es requerido`);
    }
    if (validationErrors.length > 0) return NextResponse.json({ error: "Campos requeridos faltantes", details: validationErrors }, { status: 422 });

    const allowedFieldNames = new Set((fields ?? []).map(f => f.name));
    const sanitizedData: Record<string, any> = {};
    for (const key of Object.keys(incomingData)) {
        if (allowedFieldNames.has(key)) sanitizedData[key] = incomingData[key];
    }

    const { data: newRecord, error } = await supabase.from("module_records").insert({
        module_id: module.id, org_id: member.org_id, data: sanitizedData, created_by: user.id, updated_by: user.id
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ record: newRecord }, { status: 201 });
}, { module: "studio", action: "edit" });
