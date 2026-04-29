import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const cenniBulkSchema = z.object({
    cases: z.array(z.object({
        cliente_estudiante: z.string().min(1),
        folio_cenni: z.string().min(1),
        celular: z.string().optional().nullable(),
        correo: z.string().optional().nullable(),
        solicitud_cenni: z.boolean().optional().default(false),
        acta_o_curp: z.boolean().optional().default(false),
        id_documento: z.boolean().optional().default(false),
        certificado: z.string().optional().nullable(),
        datos_curp: z.string().optional().nullable(),
        cliente: z.string().optional().nullable(),
        estatus: z.string().optional().default("EN OFICINA"),
        fecha_recepcion: z.string().optional().nullable(),
        fecha_revision: z.string().optional().nullable(),
        motivo_rechazo: z.string().optional().nullable(),
        estatus_certificado: z.string().optional().nullable(),
    }))
});

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = cenniBulkSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos o incompletos." }, { status: 400 });

    if (member.role !== "admin" && member.role !== "supervisor" && member.role !== "coordinador") {
        return NextResponse.json({ error: "Permisos insuficientes para carga masiva" }, { status: 403 });
    }

    const payload = parsed.data.cases.map(c => ({
        ...c,
        org_id: member.org_id,
    }));

    const { error } = await supabase
        .from("cenni_cases")
        .upsert(payload, { onConflict: "org_id,folio_cenni", ignoreDuplicates: false });
    if (error) throw error;

    return NextResponse.json({ success: true, count: payload.length }, { status: 201 });
}, { module: "cenni", action: "edit" });
