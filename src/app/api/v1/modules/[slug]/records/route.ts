import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ slug: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/modules/[slug]/records
// Lists records for a custom module with pagination and search.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
        const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
        const search = searchParams.get("search") ?? "";
        const offset = (page - 1) * limit;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        // Resolve module
        const { data: module } = await supabase
            .from("module_registry")
            .select("id, is_native")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .eq("is_active", true)
            .single();

        if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });
        if (module.is_native) {
            return NextResponse.json({ error: "Native modules use their own API routes" }, { status: 400 });
        }

        // Build query
        let query = supabase
            .from("module_records")
            .select("*", { count: "exact" })
            .eq("module_id", module.id)
            .eq("org_id", member.org_id)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // JSONB search (searches all string values in data)
        if (search) {
            // Uses GIN index — searches data JSONB for text match
            query = query.ilike("data::text", `%${search}%`);
        }

        const { data: records, error, count } = await query;
        if (error) throw error;

        return NextResponse.json({
            records: records ?? [],
            pagination: {
                page,
                limit,
                total: count ?? 0,
                pages: Math.ceil((count ?? 0) / limit),
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/modules/[slug]/records
// Creates a new record validating against the module's field definitions.
// ─────────────────────────────────────────────────────────────────────────────

const createRecordSchema = z.object({
    data: z.record(z.string(), z.any()),
});

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const parsed = createRecordSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.format() },
                { status: 400 }
            );
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

        // Check create permission from module_permissions
        const { data: module } = await supabase
            .from("module_registry")
            .select("id, is_native")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .eq("is_active", true)
            .single();

        if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });
        if (module.is_native) {
            return NextResponse.json({ error: "Native modules use their own API routes" }, { status: 400 });
        }

        // Permission check (admins always can)
        if (member.role !== "admin") {
            const { data: perm } = await supabase
                .from("module_permissions")
                .select("can_create")
                .eq("module_id", module.id)
                .eq("role", member.role)
                .single();

            if (!perm?.can_create) {
                return NextResponse.json({ error: "Insufficient permissions to create" }, { status: 403 });
            }
        }

        // Validate against module_fields (required check + type coercion)
        const { data: fields } = await supabase
            .from("module_fields")
            .select("name, label, field_type, is_required, options")
            .eq("module_id", module.id);

        const incomingData = parsed.data.data;
        const validationErrors: string[] = [];

        for (const field of fields ?? []) {
            if (field.field_type === "formula") continue;
            const val = incomingData[field.name];
            if (field.is_required && (val === null || val === undefined || val === "")) {
                validationErrors.push(`"${field.label}" es requerido`);
            }
        }

        if (validationErrors.length > 0) {
            return NextResponse.json(
                { error: "Campos requeridos faltantes", details: validationErrors },
                { status: 422 }
            );
        }

        // Strip unknown fields (only allow fields that exist in module_fields)
        const allowedFieldNames = new Set((fields ?? []).map((f) => f.name));
        const sanitizedData: Record<string, any> = {};
        for (const key of Object.keys(incomingData)) {
            if (allowedFieldNames.has(key)) {
                sanitizedData[key] = incomingData[key];
            }
        }

        const { data: newRecord, error } = await supabase
            .from("module_records")
            .insert({
                module_id: module.id,
                org_id: member.org_id,
                data: sanitizedData,
                created_by: user.id,
                updated_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ record: newRecord }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}
