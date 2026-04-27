import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const PAGE_LIMIT_MAX = 500;
const PAGE_LIMIT_DEFAULT = 300;

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
        parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT_DEFAULT), 10) || PAGE_LIMIT_DEFAULT,
        PAGE_LIMIT_MAX,
    );
    const q = searchParams.get("q")?.trim() ?? "";

    let query = supabase
        .from("cenni_cases")
        .select("*", { count: "exact" })
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (q) {
        query = query.or(
            `folio_cenni.ilike.%${q}%,cliente_estudiante.ilike.%${q}%,correo.ilike.%${q}%`,
        );
    }

    const { data: cases, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ cases, role: member.role, total: count ?? 0 });
}, { module: "cenni", action: "view" });

const CENNI_STATUSES = [
    "EN OFICINA",
    "SOLICITADO",
    "EN TRAMITE/REVISION",
    "APROBADO",
    "RECHAZADO",
] as const;

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
    estatus: z.enum(CENNI_STATUSES).optional().default("EN OFICINA"),
    estatus_certificado: z.string().optional().nullable(),
    fecha_recepcion: z.string().optional().nullable(),
    fecha_revision: z.string().optional().nullable(),
    motivo_rechazo: z.string().optional().nullable(),
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
            estatus: d.estatus || "EN OFICINA",
            estatus_certificado: d.estatus_certificado || null,
            fecha_recepcion: d.fecha_recepcion || null,
            fecha_revision: d.fecha_revision || null,
            motivo_rechazo: d.motivo_rechazo || null,
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
