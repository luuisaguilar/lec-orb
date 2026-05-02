import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateAuditItemSchema = z.object({
    status: z.enum(["pending", "cumple", "noconf", "oport"]).optional(),
    notes: z.string().optional().nullable(),
    next_audit_date: z.string().optional().nullable(),
});

function buildCarCode() {
    const uuidPart = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    return `CAR-${uuidPart}`;
}

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateAuditItemSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.next_audit_date !== undefined) updates.next_audit_date = parsed.data.next_audit_date;

    const { data: updated, error } = await supabase
        .from("hr_audit_checks")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("id, clause_id, title, question, status, notes, tags, sort_order, next_audit_date, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "hr_audit_checks",
        record_id: updated.id,
        action: "UPDATE",
        new_data: updated,
        performed_by: user.id,
    });

    let car: Record<string, unknown> | null = null;

    if (updated.status === "noconf") {
        const { data: existingCar } = await supabase
            .from("hr_audit_cars")
            .select("id, audit_check_id, car_code, finding_clause_id, finding_title, description, status, root_cause, action_plan, owner_name, due_date, created_at, updated_at")
            .eq("org_id", member.org_id)
            .eq("audit_check_id", updated.id)
            .maybeSingle();

        if (existingCar) {
            car = existingCar;
        } else {
            const { data: insertedCar, error: carInsertError } = await supabase
                .from("hr_audit_cars")
                .insert({
                    org_id: member.org_id,
                    audit_check_id: updated.id,
                    car_code: buildCarCode(),
                    finding_clause_id: updated.clause_id,
                    finding_title: updated.title,
                    description: updated.question,
                    status: "open",
                })
                .select("id, audit_check_id, car_code, finding_clause_id, finding_title, description, status, root_cause, action_plan, owner_name, due_date, created_at, updated_at")
                .single();

            if (carInsertError) throw carInsertError;

            await logAudit(supabase, {
                org_id: member.org_id,
                table_name: "hr_audit_cars",
                record_id: insertedCar.id,
                action: "INSERT",
                new_data: insertedCar,
                performed_by: user.id,
            });

            car = insertedCar;
        }
    }

    return NextResponse.json({ item: updated, car });
}, { module: "rrhh", action: "edit" });
