import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const roleEnum = z.enum(["EVALUATOR", "INVIGILATOR", "SUPERVISOR", "ADMIN", "REMOTE"]);

const createSchema = z.object({
    role: roleEnum,
    exam_type: z.string().max(120).optional().nullable(),
    rate_per_hour: z.number().min(0),
    effective_from: z.string().optional(),
    effective_to: z.string().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }) => {
    const { data, error } = await supabase
        .from("role_rates")
        .select("*")
        .eq("org_id", member.org_id)
        .order("role", { ascending: true })
        .order("exam_type", { ascending: true, nullsFirst: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ rates: data ?? [] });
}, { module: "payroll", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validación fallida", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    if (member.role !== "admin" && member.role !== "supervisor") {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const payload = {
        org_id: member.org_id,
        role: parsed.data.role,
        exam_type: parsed.data.exam_type?.trim() || null,
        rate_per_hour: parsed.data.rate_per_hour,
        effective_from: parsed.data.effective_from?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        effective_to: parsed.data.effective_to?.slice(0, 10) || null,
        notes: parsed.data.notes?.trim() || null,
    };

    const { data, error } = await supabase.from("role_rates").insert(payload).select().single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "Ya existe una tarifa con el mismo rol, examen y fecha de inicio." },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "role_rates",
        record_id: data.id,
        action: "INSERT",
        new_data: data as unknown as Record<string, unknown>,
        performed_by: user.id,
    });

    return NextResponse.json({ rate: data }, { status: 201 });
}, { module: "payroll", action: "edit" });
