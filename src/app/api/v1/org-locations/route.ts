import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const createSchema = z.object({
    name: z.string().min(1, "Nombre requerido").max(200),
    sort_order: z.number().int().optional(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "1" || searchParams.get("includeInactive") === "true";

    let query = supabase
        .from("org_locations")
        .select("id, org_id, name, sort_order, is_active, created_at, updated_at")
        .eq("org_id", member.org_id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (!includeInactive) {
        query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ locations: data ?? [] });
}, { module: "users", action: "view" });

export const POST = withAuth(async (req, { supabase, member }) => {
    if (member.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: solo administradores" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos invalidos", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const name = parsed.data.name.trim();
    const { data, error } = await supabase
        .from("org_locations")
        .insert({
            org_id: member.org_id,
            name,
            sort_order: parsed.data.sort_order ?? 0,
            is_active: true,
        })
        .select("id, org_id, name, sort_order, is_active, created_at, updated_at")
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "Ya existe una sede con ese nombre en tu organizacion." },
                { status: 409 }
            );
        }
        throw error;
    }

    return NextResponse.json({ location: data }, { status: 201 });
}, { module: "users", action: "edit" });
