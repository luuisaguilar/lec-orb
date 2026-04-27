import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const CENNI_STATUSES = [
    "EN OFICINA",
    "SOLICITADO",
    "EN TRAMITE/REVISION",
    "APROBADO",
    "RECHAZADO",
] as const;

const updateCenniSchema = z.object({
    folio_cenni: z.string().min(1).optional(),
    cliente_estudiante: z.string().min(1).optional(),
    celular: z.string().nullable().optional(),
    correo: z.string().nullable().optional(),
    solicitud_cenni: z.boolean().optional(),
    acta_o_curp: z.boolean().optional(),
    id_documento: z.boolean().optional(),
    certificado: z.string().nullable().optional(),
    datos_curp: z.string().nullable().optional(),
    cliente: z.string().nullable().optional(),
    estatus: z.enum(CENNI_STATUSES).optional(),
    estatus_certificado: z.enum(["APROBADO", "RECHAZADO", "EN PROCESO DE DICTAMINACION"]).nullable().optional(),
    fecha_recepcion: z.string().nullable().optional(),
    fecha_revision: z.string().nullable().optional(),
    motivo_rechazo: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
});

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCenniSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error }, { status: 400 });

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const { data: oldCase } = await supabase
        .from("cenni_cases")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .single();

    const { data: updatedCase, error } = await supabase
        .from("cenni_cases")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .select()
        .single();

    if (error || !updatedCase) return NextResponse.json({ error: error?.message || "Case not found" }, { status: 404 });

    await supabase.from("audit_log").insert({
        org_id: member.org_id,
        table_name: "cenni_cases",
        record_id: id,
        action: "UPDATE",
        old_data: oldCase ?? null,
        new_data: updatedCase,
        performed_by: user.id,
    });

    return NextResponse.json({ case: updatedCase });
}, { module: "cenni", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { data: oldCase } = await supabase
        .from("cenni_cases")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .single();

    const { error } = await supabase
        .from("cenni_cases")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;

    await supabase.from("audit_log").insert({
        org_id: member.org_id,
        table_name: "cenni_cases",
        record_id: id,
        action: "DELETE",
        old_data: oldCase ?? null,
        new_data: null,
        performed_by: user.id,
    });

    return NextResponse.json({ success: true });
}, { module: "cenni", action: "delete" });
