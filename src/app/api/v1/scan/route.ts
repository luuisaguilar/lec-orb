import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const scanSchema = z.object({
    codigo: z.string().min(1).trim(),
    type: z.enum(["SALIDA", "ENTRADA", "AJUSTE"]),
    school_id: z.string().nullable().optional().or(z.literal("undefined").transform(() => null)),
    school_name: z.string().optional().nullable(),
    applicator_id: z.string().nullable().optional().or(z.literal("undefined").transform(() => null)),
    applicator_name: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { codigo, type, school_id, school_name, applicator_id, applicator_name, notes } = parsed.data;

    const { data: pack } = await supabase
        .from("packs")
        .select("id, status, codigo, nombre")
        .eq("org_id", member.org_id)
        .eq("codigo", codigo)
        .is("deleted_at", null)
        .single();

    if (!pack) return NextResponse.json({ error: "Pack not found", codigo }, { status: 404 });

    const { data: result, error: rpcError } = await supabase.rpc("create_movement_and_update_pack", {
        p_org_id: member.org_id,
        p_pack_id: pack.id,
        p_type: type,
        p_school_id: school_id || null,
        p_school_name: school_name || null,
        p_applicator_id: applicator_id || null,
        p_applicator_name: applicator_name || null,
        p_notes: notes || null,
    });

    if (rpcError) return NextResponse.json({ error: rpcError.message || "Movement failed" }, { status: 400 });

    return NextResponse.json({
        success: true,
        pack: { id: pack.id, codigo: pack.codigo, nombre: pack.nombre },
        movement: result,
    });
}, { module: "inventory", action: "edit" });

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const codigo = url.searchParams.get("codigo")?.trim();
    if (!codigo) return NextResponse.json({ error: "Missing codigo parameter" }, { status: 400 });

    const { data: pack } = await supabase
        .from("packs")
        .select("*")
        .eq("org_id", member.org_id)
        .eq("codigo", codigo)
        .is("deleted_at", null)
        .single();

    if (!pack) return NextResponse.json({ error: "Pack not found", codigo }, { status: 404 });

    const { data: movements } = await supabase
        .from("movements")
        .select("*")
        .eq("pack_id", pack.id)
        .order("created_at", { ascending: false })
        .limit(5);

    return NextResponse.json({ pack, movements: movements || [] });
}, { module: "inventory", action: "view" });
