import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const patchSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
});

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    if (member.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: solo administradores" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos invalidos", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.sort_order !== undefined) updates.sort_order = parsed.data.sort_order;
    if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;

    if (Object.keys(updates).length <= 1) {
        return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("org_locations")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("id, org_id, name, sort_order, is_active, created_at, updated_at")
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return NextResponse.json({ error: "Sede no encontrada" }, { status: 404 });
        }
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "Ya existe una sede con ese nombre en tu organizacion." },
                { status: 409 }
            );
        }
        throw error;
    }

    return NextResponse.json({ location: data });
}, { module: "users", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    if (member.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: solo administradores" }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
        .from("org_locations")
        .delete()
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
}, { module: "users", action: "delete" });
