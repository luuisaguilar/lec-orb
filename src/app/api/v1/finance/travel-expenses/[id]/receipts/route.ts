import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const createReceiptSchema = z.object({
    file_name: z.string().min(1).max(255),
    file_type: z.enum(["pdf", "xlsx", "xls", "csv", "other"]),
    file_url: z.string().url(),
    amount: z.number().positive().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const POST = withAuth(async (req, { supabase, member, user }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = createReceiptSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const { data: report, error: reportError } = await supabase
        .from("travel_expense_reports")
        .select("id")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (reportError || !report) {
        return NextResponse.json({ error: "Travel report not found" }, { status: 404 });
    }

    const { data, error } = await supabase
        .from("travel_expense_receipts")
        .insert({
            org_id: member.org_id,
            report_id: id,
            file_name: parsed.data.file_name,
            file_type: parsed.data.file_type,
            file_url: parsed.data.file_url,
            amount: parsed.data.amount ?? null,
            notes: parsed.data.notes ?? null,
            uploaded_by: user.id,
        })
        .select("id, report_id, file_name, file_type, file_url, amount, notes, uploaded_by, created_at, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "travel_expense_receipts",
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ receipt: data }, { status: 201 });
}, { module: "finanzas", action: "edit" });

