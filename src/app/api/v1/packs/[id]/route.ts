import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";

const patchSchema = z.object({
    status: z.enum(["EN_SITIO", "PRESTADO"]).optional(),
    nombre: z.string().optional(),
    notes: z.string().optional(),
    // Allow frontend "undefined" string to become null or be stripped
    school_id: z.string().uuid().nullable().optional().or(z.literal("undefined").transform(() => null)),
    applicator_id: z.string().uuid().nullable().optional().or(z.literal("undefined").transform(() => null)),
});

// PATCH /api/v1/packs/[id] — Update a pack
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed" }, { status: 400 });
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

        const canEdit = await checkServerPermission(supabase, user.id, "inventario", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions to edit packs" }, { status: 403 });
        }

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (parsed.data.status !== undefined) {
            updateData.status = parsed.data.status;
            // Provide fallback timestamps if updating manually from table actions
            const now = new Date();
            // Get local time in Mexico if possible, or UTC fallback
            const timeString = new Intl.DateTimeFormat('es-MX', {
                timeZone: 'America/Mexico_City',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(now);
            const dateString = new Intl.DateTimeFormat('fr-CA', {
                timeZone: 'America/Mexico_City',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(now);

            updateData.fecha = dateString;
            if (parsed.data.status === "PRESTADO") {
                updateData.hora_salida = timeString;
            } else if (parsed.data.status === "EN_SITIO") {
                updateData.hora_entrada = timeString;
            }
        }
        if (parsed.data.nombre !== undefined) updateData.nombre = parsed.data.nombre;
        if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
        if (parsed.data.school_id !== undefined) updateData.school_id = parsed.data.school_id;
        if (parsed.data.applicator_id !== undefined) updateData.applicator_id = parsed.data.applicator_id;

        const { data: pack, error } = await supabase
            .from("packs")
            .update(updateData)
            .eq("id", id)
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .select()
            .single();

        if (error || !pack) {
            return NextResponse.json({ error: error?.message || "Pack not found" }, { status: 404 });
        }

        return NextResponse.json({ pack });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/v1/packs/[id] — Soft-delete a pack
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
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const canDelete = await checkServerPermission(supabase, user.id, "inventario", "delete");
        if (!canDelete) {
            return NextResponse.json({ error: "Insufficient permissions to delete packs" }, { status: 403 });
        }

        const { error } = await supabase
            .from("packs")
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
