import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

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
    estatus: z.enum([
        "SOLICITADO",
        "EN OFICINA",
        "EN OFICINA/POR ENVIAR",
        "EN TRAMITE",
        "REVISION",
        "APROBADO",
        "RECHAZADO",
    ]).optional(),
    estatus_certificado: z.enum(["APROBADO", "RECHAZADO", "EN PROCESO DE DICTAMINACION"]).nullable().optional(),
    notes: z.string().nullable().optional(),
    created_at: z.string().datetime({ offset: true }).optional(), // editable registration date
});

// PATCH /api/v1/cenni/[id] — Update a case
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = updateCenniSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const d = parsed.data;
        // Don't include undefined fields in update payload
        const updates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(d)) {
            if (value !== undefined) {
                updates[key] = value;
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const { data: updatedCase, error } = await supabase
            .from("cenni_cases")
            .update(updates)
            .eq("id", id)
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .select()
            .single();

        if (error || !updatedCase) {
            return NextResponse.json({ error: error?.message || "Case not found" }, { status: 404 });
        }

        return NextResponse.json({ case: updatedCase });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/v1/cenni/[id] — Soft-delete a case
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member || !["admin", "supervisor"].includes(member.role)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { error } = await supabase
            .from("cenni_cases")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id)
            .eq("org_id", member.org_id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
