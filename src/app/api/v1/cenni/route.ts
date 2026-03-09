import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canView = await checkServerPermission(supabase, user.id, "cenni", "view");
        if (!canView) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        const { data: cases, error } = await supabase
            .from("cenni_cases")
            .select("*")
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ cases, role: member.role, total: cases.length });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createCenniSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canEdit = await checkServerPermission(supabase, user.id, "cenni", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
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

        if (error) {
            return NextResponse.json({ error: "Failed to create case: " + error.message }, { status: 500 });
        }

        await supabase.from("audit_log").insert({
            org_id: member.org_id,
            table_name: "cenni_cases",
            record_id: newCase.id,
            action: "INSERT",
            new_data: newCase,
            performed_by: user.id,
        });

        return NextResponse.json({ case: newCase }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
