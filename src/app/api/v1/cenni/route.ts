import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: cases, error } = await supabase
        .from("cenni_cases")
        .select("*")
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ cases, role: member.role, total: cases.length });
}, { module: "cenni", action: "view" });

const createCenniSchema = z.object({
    folio_cenni: z.string().min(1),
    cliente_estudiante: z.string().min(1),
    celular: z.string().optional().nullable(),
    correo: z.string().optional().nullable(),
    solicitud_cenni: z.boolean().optional().default(false),
    acta_o_curp: z.boolean().optional().default(false),
    id_documento: z.boolean().optional().default(false),
    certificado: z.string().optional().nullable(),
    datos_curp: z.string().optional().nullable(),
    cliente: z.string().optional().nullable(),
    estatus: z.string().optional().default("EN OFICINA"),
    estatus_certificado: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = createCenniSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const d = parsed.data;

    const { data: newCase, error } = await supabase
        .from("cenni_cases")
        .insert({
            org_id: member.org_id,
            folio_cenni: d.folio_cenni,
            cliente_estudiante: d.cliente_estudiante,
            celular: d.celular || null,
            correo: d.correo || null,
            solicitud_cenni: d.solicitud_cenni,
            acta_o_curp: d.acta_o_curp,
            id_documento: d.id_documento,
            certificado: d.certificado || null,
            datos_curp: d.datos_curp || null,
            cliente: d.cliente || null,
            estatus: d.estatus || "SOLICITADO",
            estatus_certificado: d.estatus_certificado || null,
            notes: d.notes || null,
        })
        .select()
        .single();

    if (error) throw error;

    await supabase.from("audit_log").insert({
        org_id: member.org_id,
        table_name: "cenni_cases",
        record_id: newCase.id,
        action: "INSERT",
        new_data: newCase,
        performed_by: user.id,
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
}, { module: "cenni", action: "edit" });
