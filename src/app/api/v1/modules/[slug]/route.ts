import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteParams {
    params: Promise<{ slug: string }>;
}

/**
 * GET /api/v1/modules/[slug]
 * Returns details for a single module including its fields (if custom).
 */
export async function GET(_request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        const { data: module, error } = await supabase
            .from("module_registry")
            .select("*")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .eq("is_active", true)
            .single();

        if (error || !module) {
            return NextResponse.json({ error: "Module not found" }, { status: 404 });
        }

        // For custom modules, also return fields and permissions
        let fields = null;
        let permissions = null;

        if (!module.is_native) {
            const [fieldsRes, permsRes] = await Promise.all([
                supabase
                    .from("module_fields")
                    .select("*")
                    .eq("module_id", module.id)
                    .order("sort_order", { ascending: true }),
                supabase
                    .from("module_permissions")
                    .select("*")
                    .eq("module_id", module.id),
            ]);
            fields = fieldsRes.data ?? [];
            permissions = permsRes.data ?? [];
        }

        return NextResponse.json({ module, fields, permissions });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/modules/[slug] — Update module metadata (Studio)
// ─────────────────────────────────────────────────────────────────────────────

const updateModuleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    icon: z.string().max(50).optional(),
    description: z.string().max(500).nullable().optional(),
    category: z.string().max(50).nullable().optional(),
    sort_order: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    config: z.record(z.string(), z.any()).optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const parsed = updateModuleSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.format() },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member || member.role !== "admin") {
            return NextResponse.json(
                { error: "Only admins can edit modules" },
                { status: 403 }
            );
        }

        // Find the module
        const { data: module } = await supabase
            .from("module_registry")
            .select("id, is_native, org_id")
            .eq("slug", slug)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .single();

        if (!module) {
            return NextResponse.json({ error: "Module not found" }, { status: 404 });
        }

        // For native modules only allow updating sort_order and is_active
        const updateData: any = {};
        if (module.is_native) {
            if (parsed.data.sort_order !== undefined) updateData.sort_order = parsed.data.sort_order;
            if (parsed.data.is_active !== undefined) updateData.is_active = parsed.data.is_active;
        } else {
            Object.assign(updateData, parsed.data);
        }

        const { data: updated, error } = await supabase
            .from("module_registry")
            .update(updateData)
            .eq("id", module.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ module: updated });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/modules/[slug] — Soft-delete a custom module
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(_request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member || member.role !== "admin") {
            return NextResponse.json(
                { error: "Only admins can delete modules" },
                { status: 403 }
            );
        }

        const { data: module } = await supabase
            .from("module_registry")
            .select("id, is_native, org_id")
            .eq("slug", slug)
            .eq("org_id", member.org_id)  // Custom modules have an org_id
            .single();

        if (!module) {
            return NextResponse.json(
                { error: "Module not found or cannot be deleted" },
                { status: 404 }
            );
        }

        if (module.is_native) {
            return NextResponse.json(
                { error: "Native modules cannot be deleted. You can disable them instead." },
                { status: 400 }
            );
        }

        // Soft delete
        const { error } = await supabase
            .from("module_registry")
            .update({ is_active: false })
            .eq("id", module.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
