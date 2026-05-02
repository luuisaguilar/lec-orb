import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateReportSchema = z.object({
    payroll_period_id: z.string().uuid().optional().nullable(),
    employee_name: z.string().min(1).max(200).optional(),
    destination: z.string().min(1).max(200).optional(),
    trip_purpose: z.string().min(1).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    amount_requested: z.number().positive().optional(),
    amount_approved: z.number().positive().optional().nullable(),
    status: z.enum(["pending", "approved", "rejected", "reimbursed"]).optional(),
    approval_notes: z.string().optional().nullable(),
});

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateReportSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: user.id,
    };

    const fields = parsed.data;
    if (fields.payroll_period_id !== undefined) updates.payroll_period_id = fields.payroll_period_id;
    if (fields.employee_name !== undefined) updates.employee_name = fields.employee_name;
    if (fields.destination !== undefined) updates.destination = fields.destination;
    if (fields.trip_purpose !== undefined) updates.trip_purpose = fields.trip_purpose;
    if (fields.start_date !== undefined) updates.start_date = fields.start_date;
    if (fields.end_date !== undefined) updates.end_date = fields.end_date;
    if (fields.amount_requested !== undefined) updates.amount_requested = fields.amount_requested;
    if (fields.amount_approved !== undefined) updates.amount_approved = fields.amount_approved;
    if (fields.approval_notes !== undefined) updates.approval_notes = fields.approval_notes;

    if (fields.status !== undefined) {
        updates.status = fields.status;
        if (fields.status === "approved") {
            updates.approved_by = user.id;
            updates.approved_at = new Date().toISOString();
        }
        if (fields.status === "rejected" || fields.status === "pending") {
            updates.approved_by = null;
            updates.approved_at = null;
        }
    }

    const { data, error } = await supabase
        .from("travel_expense_reports")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("id, payroll_period_id, employee_name, destination, trip_purpose, start_date, end_date, amount_requested, amount_approved, status, approval_notes, approved_by, approved_at, created_by, updated_by, created_at, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "travel_expense_reports",
        record_id: data.id,
        action: "UPDATE",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ report: data });
}, { module: "finanzas", action: "edit" });

