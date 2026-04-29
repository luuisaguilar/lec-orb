import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let query = supabase
        .from("packs")
        .select(`
            *,
            school:schools(id, name),
            applicator:applicators(id, name)
        `, { count: "exact" })
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`codigo.ilike.%${search}%,nombre.ilike.%${search}%`);
    }

    if (status === "EN_SITIO" || status === "PRESTADO") {
        query = query.eq("status", status);
    }

    const { data: packs, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
        packs: packs || [],
        total: count || 0,
        page,
        limit,
    });
}, { module: "inventory", action: "view" });

const createPackSchema = z.object({
    codigo: z.string().min(1).trim(),
    nombre: z.string().optional().default(""),
    status: z.enum(["EN_SITIO", "PRESTADO"]).default("EN_SITIO"),
    school_id: z.string().uuid().optional().nullable(),
    applicator_id: z.string().uuid().optional().nullable(),
    notes: z.string().optional(),
});

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = createPackSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { codigo, nombre, notes } = parsed.data;

    const statusToSet = parsed.data.status || "EN_SITIO";
    const now = new Date();
    
    // Robust date formatting for DB
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = now.toISOString();

    const { data: pack, error } = await supabase
        .from("packs")
        .insert({
            org_id: member.org_id,
            codigo,
            nombre,
            notes,
            status: statusToSet,
            school_id: parsed.data.school_id || null,
            applicator_id: parsed.data.applicator_id || null,
            fecha: dateString,
            hora_salida: statusToSet === "PRESTADO" ? timeString : null,
            hora_entrada: statusToSet === "EN_SITIO" ? timeString : null,
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "A pack with this code already exists" }, { status: 409 });
        throw error;
    }

    return NextResponse.json({ pack }, { status: 201 });
}, { module: "inventory", action: "edit" });
