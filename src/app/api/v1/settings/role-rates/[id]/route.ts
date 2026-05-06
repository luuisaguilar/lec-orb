import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const patchSchema = z.object({
    rate_per_hour: z.number().min(0).optional(),
    exam_type: z.string().max(120).optional().nullable(),
    effective_from: z.string().optional(),
    effective_to: z.string().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
});

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    if (member.role !== "admin" && member.role !== "supervisor") {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json({ error: "Validación fallida" }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabase
        .from("role_rates")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (fetchErr || !existing) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.rate_per_hour !== undefined) updates.rate_per_hour = parsed.data.rate_per_hour;
    if (parsed.data.exam_type !== undefined) {
        updates.exam_type = parsed.data.exam_type?.trim() || null;
    }
    if (parsed.data.effective_from !== undefined) {
        updates.effective_from = parsed.data.effective_from.slice(0, 10);
    }
    if (parsed.data.effective_to !== undefined) {
        updates.effective_to = parsed.data.effective_to?.slice(0, 10) || null;
    }
    if (parsed.data.notes !== undefined) {
        updates.notes = parsed.data.notes?.trim() || null;
    }

    const { data, error } = await supabase
        .from("role_rates")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "role_rates",
        record_id: id,
        action: "UPDATE",
        old_data: existing as unknown as Record<string, unknown>,
        new_data: data as unknown as Record<string, unknown>,
        performed_by: user.id,
    });

    return NextResponse.json({ rate: data });
}, { module: "payroll", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    if (member.role !== "admin" && member.role !== "supervisor") {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { data: existing, error: fetchErr } = await supabase
        .from("role_rates")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (fetchErr || !existing) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const { error } = await supabase.from("role_rates").delete().eq("id", id).eq("org_id", member.org_id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "role_rates",
        record_id: id,
        action: "DELETE",
        old_data: existing as unknown as Record<string, unknown>,
        performed_by: user.id,
    });

    return NextResponse.json({ success: true });
}, { module: "payroll", action: "edit" });
