import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";

/**
 * GET /api/v1/modules
 * Returns all active modules visible to the current user's org.
 * Used by the dynamic sidebar to know which modules to render.
 *
 * Returns:
 *  - Global modules (org_id IS NULL = built-in native modules)
 *  - Org-specific custom modules for the user's org
 *
 * Filtered by user's permissions (can_view per module).
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the user's org membership
        const { data: member } = await supabase
            .from("org_members")
            .select("id, org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        // Fetch global (built-in) + org-specific modules
        const { data: modules, error } = await supabase
            .from("module_registry")
            .select("id, slug, name, icon, category, is_native, sort_order, config, description")
            .eq("is_active", true)
            .or(`org_id.is.null,org_id.eq.${member.org_id}`)
            .order("sort_order", { ascending: true });

        if (error) throw error;

        // For admins, return all modules
        if (member.role === "admin") {
            return NextResponse.json({ modules, role: member.role });
        }

        // For non-admins: filter by module_permissions (for custom modules)
        // Native modules are filtered client-side by existing permissions system (SWR /users/me)
        // Custom modules use module_permissions table
        const { data: permRows } = await supabase
            .from("module_permissions")
            .select("module_id, can_view")
            .in(
                "module_id",
                modules
                    .filter((m) => !m.is_native)
                    .map((m) => m.id)
            )
            .eq("role", member.role)
            .eq("can_view", true);

        const allowedCustomIds = new Set(permRows?.map((p) => p.module_id) ?? []);

        const filtered = modules.filter(
            (m) => m.is_native || allowedCustomIds.has(m.id)
        );

        return NextResponse.json({ modules: filtered, role: member.role });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/modules — Create a custom module (Studio)
// ─────────────────────────────────────────────────────────────────────────────

const createModuleSchema = z.object({
    slug: z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
    name: z.string().min(1).max(100),
    icon: z.string().max(50).default("FileText"),
    description: z.string().max(500).optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    sort_order: z.number().int().min(0).default(100),
    config: z.record(z.string(), z.any()).optional().default({}),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createModuleSchema.safeParse(body);

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

        // Only admins can create modules
        const { data: member } = await supabase
            .from("org_members")
            .select("id, org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member || member.role !== "admin") {
            return NextResponse.json(
                { error: "Only admins can create modules" },
                { status: 403 }
            );
        }

        const d = parsed.data;

        // Check slug doesn't conflict with native modules
        const nativeSlugs = [
            "dashboard", "schools", "applicators", "events", "inventory",
            "toefl", "cenni", "exam-codes", "calculator", "catalog",
            "quotes", "purchase-orders", "payments", "payroll", "users", "audit-log"
        ];
        if (nativeSlugs.includes(d.slug)) {
            return NextResponse.json(
                { error: `Slug "${d.slug}" is reserved for a native module` },
                { status: 409 }
            );
        }

        const { data: newModule, error } = await supabase
            .from("module_registry")
            .insert({
                org_id: member.org_id,
                slug: d.slug,
                name: d.name,
                icon: d.icon,
                description: d.description,
                category: d.category,
                sort_order: d.sort_order,
                is_native: false,
                is_active: true,
                config: d.config,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: `A module with slug "${d.slug}" already exists` },
                    { status: 409 }
                );
            }
            throw error;
        }

        // Seed default permissions for all roles
        const defaultPerms = [
            { module_id: newModule.id, role: "admin", can_view: true, can_create: true, can_edit: true, can_delete: true },
            { module_id: newModule.id, role: "supervisor", can_view: true, can_create: true, can_edit: true, can_delete: false },
            { module_id: newModule.id, role: "operador", can_view: true, can_create: false, can_edit: false, can_delete: false },
            { module_id: newModule.id, role: "applicator", can_view: false, can_create: false, can_edit: false, can_delete: false },
        ];
        await supabase.from("module_permissions").insert(defaultPerms);

        return NextResponse.json({ module: newModule }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
