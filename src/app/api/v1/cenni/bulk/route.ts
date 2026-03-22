import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";
import { withAuth } from "@/lib/auth/with-handler";
import { normalizeCenniCaseInput } from "@/lib/cenni/normalize";

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
        estatus: z.string().optional().default("SOLICITADO"),
        estatus_certificado: z.string().optional().nullable(),
    }))
});

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = cenniBulkSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos o incompletos." }, { status: 400 });

    if (DEMO_MODE) {
        const { addBulkMockCenni } = await import("@/lib/demo/data");
        const newCases = parsed.data.cases.map((currentCase) => normalizeCenniCaseInput(currentCase));
        addBulkMockCenni(newCases);
        return NextResponse.json({ count: newCases.length, success: true }, { status: 201 });
    }

    if (member.role !== "admin" && member.role !== "supervisor" && member.role !== "coordinador") {
        return NextResponse.json({ error: "Permisos insuficientes para carga masiva" }, { status: 403 });
    }

    const payload = parsed.data.cases.map((currentCase) => ({
        org_id: member.org_id,
        ...normalizeCenniCaseInput(currentCase),
    }));

    const { error } = await supabase.from("cenni_cases").insert(payload);
    if (error) throw error;

    return NextResponse.json({ success: true, count: payload.length }, { status: 201 });
}, { module: "cenni", action: "edit" });
