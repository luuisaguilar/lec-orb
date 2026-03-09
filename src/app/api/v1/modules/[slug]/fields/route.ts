import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ slug: string }>;
}

const VALID_FIELD_TYPES = [
    "text", "textarea", "number", "currency", "date", "datetime",
    "select", "multiselect", "boolean", "email", "phone", "url",
    "file", "relation", "formula", "status"
] as const;

// GET /api/v1/modules/[slug]/fields
export async function GET(_request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params;
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

        const { data: fields, error } = await supabase
            .from("module_fields")
            .select("*")
            .eq("module_id", module.id)
            .order("sort_order", { ascending: true });

        if (error) throw error;
        return NextResponse.json({ fields: fields ?? [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}

// POST /api/v1/modules/[slug]/fields
const createFieldSchema = z.object({
    name: z.string()
        .min(1).max(50)
        .regex(/^[a-z0-9_]+$/, "Field name must be lowercase letters, numbers, and underscores"),
    label: z.string().min(1).max(100),
    field_type: z.enum(VALID_FIELD_TYPES),
    is_required: z.boolean().default(false),
    default_value: z.string().nullable().optional(),
    options: z.record(z.string(), z.any()).default({}),
    sort_order: z.number().int().min(0).default(0),
    show_in_list: z.boolean().default(true),
    is_searchable: z.boolean().default(false),
    validation: z.record(z.string(), z.any()).default({}),
});

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const parsed = createFieldSchema.safeParse(body);

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
            return NextResponse.json({ error: "Only admins can create fields" }, { status: 403 });
        }

        const { data: module } = await supabase
            .from("module_registry")
            .select("id, is_native")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .eq("is_active", true)
            .single();
        if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });
        if (module.is_native) {
            return NextResponse.json({ error: "Cannot add fields to native modules" }, { status: 400 });
        }

        const { data: field, error } = await supabase
            .from("module_fields")
            .insert({ ...parsed.data, module_id: module.id })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: `Field name "${parsed.data.name}" already exists in this module` }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({ field }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}
