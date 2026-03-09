import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";

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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = cenniBulkSchema.safeParse(body);
        if (!parsed.success) {
            console.error("CENNI Bulk validation failed:", parsed.error);
            return NextResponse.json({ error: "Datos inválidos o incompletos." }, { status: 400 });
        }

        if (DEMO_MODE) {
            const { addBulkMockCenni } = await import("@/lib/demo/data");

            const newCases = parsed.data.cases.map(c => ({
                cliente_estudiante: c.cliente_estudiante,
                folio_cenni: c.folio_cenni,
                celular: c.celular ?? null,
                correo: c.correo ?? null,
                solicitud_cenni: c.solicitud_cenni,
                acta_o_curp: c.acta_o_curp,
                id_documento: c.id_documento,
                certificado: c.certificado ?? null,
                datos_curp: c.datos_curp ?? null,
                cliente: c.cliente ?? null,
                estatus: c.estatus,
                estatus_certificado: c.estatus_certificado ?? null,
                notes: null,
            }));

            addBulkMockCenni(newCases);
            return NextResponse.json({ count: newCases.length, success: true }, { status: 201 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Retrieve org constraints
        const { data: member } = await supabase.from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member || !["admin", "supervisor", "coordinador"].includes(member.role)) {
            return NextResponse.json({ error: "Permisos insuficientes para carga masiva" }, { status: 403 });
        }

        // Attach org_id to all items
        const payload = parsed.data.cases.map(c => ({
            ...c,
            org_id: member.org_id,
        }));

        const { error } = await supabase
            .from("cenni_cases")
            .insert(payload);

        if (error) {
            console.error("Supabase Bulk Insert Error (CENNI):", error);
            const errMsg = error.message || error.details || JSON.stringify(error);
            return NextResponse.json({ error: `Error DB: ${errMsg}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: payload.length }, { status: 201 });

    } catch (err: any) {
        console.error("Bulk CENNI catch error:", err);
        return NextResponse.json({ error: "Error interno en el servidor." }, { status: 500 });
    }
}
