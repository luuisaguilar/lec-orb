import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const createAuditItemSchema = z.object({
    clause_id: z.string().min(1).max(20),
    title: z.string().min(1).max(200),
    question: z.string().min(1),
    tags: z.array(z.string()).default([]),
    sort_order: z.number().int().min(0).optional(),
    next_audit_date: z.string().optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }) => {
    const [{ data: items, error: itemsError }, { data: cars, error: carsError }] = await Promise.all([
        supabase
            .from("hr_audit_checks")
            .select("id, clause_id, title, question, status, notes, tags, sort_order, next_audit_date, updated_at")
            .eq("org_id", member.org_id)
            .order("sort_order", { ascending: true })
            .order("clause_id", { ascending: true }),
        supabase
            .from("hr_audit_cars")
            .select("id, audit_check_id, car_code, finding_clause_id, finding_title, description, status, root_cause, action_plan, owner_name, due_date, created_at, updated_at")
            .eq("org_id", member.org_id)
            .order("created_at", { ascending: false }),
    ]);

    if (itemsError) throw itemsError;
    if (carsError) throw carsError;

    return NextResponse.json({
        items: items ?? [],
        cars: cars ?? [],
    });
}, { module: "rrhh", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = createAuditItemSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const payload = parsed.data;

    const { data, error } = await supabase
        .from("hr_audit_checks")
        .insert({
            org_id: member.org_id,
            clause_id: payload.clause_id,
            title: payload.title,
            question: payload.question,
            tags: payload.tags,
            sort_order: payload.sort_order ?? 999,
            next_audit_date: payload.next_audit_date ?? null,
            status: "pending",
        })
        .select("id, clause_id, title, question, status, notes, tags, sort_order, next_audit_date, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "hr_audit_checks",
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ item: data }, { status: 201 });
}, { module: "rrhh", action: "edit" });
