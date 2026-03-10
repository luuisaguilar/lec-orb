import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const patchSchema = z.object({
    status: z.enum(["EN_SITIO", "PRESTADO"]).optional(),
    nombre: z.string().optional(),
    notes: z.string().optional(),
    school_id: z.string().uuid().nullable().optional().or(z.literal("undefined").transform(() => null)),
    applicator_id: z.string().uuid().nullable().optional().or(z.literal("undefined").transform(() => null)),
});

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.status !== undefined) {
        updateData.status = parsed.data.status;
        const now = new Date();
        const timeString = new Intl.DateTimeFormat('es-MX', {
            timeZone: 'America/Mexico_City',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        }).format(now);
        const dateString = new Intl.DateTimeFormat('fr-CA', {
            timeZone: 'America/Mexico_City',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(now);

        updateData.fecha = dateString;
        if (parsed.data.status === "PRESTADO") updateData.hora_salida = timeString;
        else if (parsed.data.status === "EN_SITIO") updateData.hora_entrada = timeString;
    }
    if (parsed.data.nombre !== undefined) updateData.nombre = parsed.data.nombre;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.school_id !== undefined) updateData.school_id = parsed.data.school_id;
    if (parsed.data.applicator_id !== undefined) updateData.applicator_id = parsed.data.applicator_id;

    const { data: pack, error } = await supabase
        .from("packs")
        .update(updateData)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .select()
        .single();

    if (error || !pack) return NextResponse.json({ error: error?.message || "Pack not found" }, { status: 404 });
    return NextResponse.json({ pack });
}, { module: "inventory", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("packs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "inventory", action: "delete" });
