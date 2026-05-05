import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: modules, error } = await supabase
        .from("module_registry")
        .select("id, slug, name, icon, category, is_native, sort_order, config, description")
        .eq("is_active", true)
        .or(`org_id.is.null,org_id.eq.${member.org_id}`)
        .order("sort_order", { ascending: true });

    if (error) throw error;

    if (member.role === "admin") {
        return NextResponse.json({ modules, role: member.role });
    }

    const { data: permRows } = await supabase
        .from("module_permissions")
        .select("module_id, can_view")
        .in("module_id", modules.filter((m: any) => !m.is_native).map((m: any) => m.id))
        .eq("role", member.role)
        .eq("can_view", true);

    const allowedCustomIds = new Set(permRows?.map((p: any) => p.module_id) ?? []);
    const filtered = modules.filter((m: any) => m.is_native || allowedCustomIds.has(m.id));

    return NextResponse.json({ modules: filtered, role: member.role });
}); // Listing modules is required for all authenticated members (sidebar); Studio permission applies to POST only

const createModuleSchema = z.object({
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(100),
    icon: z.string().max(50).default("FileText"),
    description: z.string().max(500).optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    sort_order: z.number().int().min(0).default(100),
    config: z.record(z.string(), z.any()).optional().default({}),
});

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = createModuleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    if (member.role !== "admin") return NextResponse.json({ error: "Only admins can create modules" }, { status: 403 });

    const d = parsed.data;
    const { data: newModule, error } = await supabase
        .from("module_registry")
        .insert({
            org_id: member.org_id,
            ...d,
            is_native: false,
            is_active: true,
        })
        .select()
        .single();

    if (error) throw error;

    const defaultPerms = [
        { module_id: newModule.id, role: "admin", can_view: true, can_create: true, can_edit: true, can_delete: true },
        { module_id: newModule.id, role: "supervisor", can_view: true, can_create: true, can_edit: true, can_delete: false },
        { module_id: newModule.id, role: "operador", can_view: true, can_create: false, can_edit: false, can_delete: false },
        { module_id: newModule.id, role: "applicator", can_view: false, can_create: false, can_edit: false, can_delete: false },
    ];
    await supabase.from("module_permissions").insert(defaultPerms);

    return NextResponse.json({ module: newModule }, { status: 201 });
}, { module: "studio", action: "edit" });
