import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const createReportSchema = z.object({
    payroll_period_id: z.string().uuid().optional().nullable(),
    employee_name: z.string().min(1).max(200),
    destination: z.string().min(1).max(200),
    trip_purpose: z.string().min(1),
    start_date: z.string().min(1),
    end_date: z.string().min(1),
    amount_requested: z.number().positive(),
});

function groupReceiptsByReport(receipts: any[]) {
    const map = new Map<string, any[]>();
    for (const receipt of receipts ?? []) {
        const list = map.get(receipt.report_id) ?? [];
        list.push(receipt);
        map.set(receipt.report_id, list);
    }
    return map;
}

type ReportRow = {
    id: string;
    payroll_period_id: string | null;
    employee_name: string;
    destination: string;
    trip_purpose: string;
    start_date: string;
    end_date: string;
    amount_requested: number;
    amount_approved: number | null;
    status: string;
    approval_notes: string | null;
    approved_by: string | null;
    approved_at: string | null;
    created_by: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
};

type ReceiptRow = {
    id: string;
    report_id: string;
    file_name: string;
    file_type: string;
    file_url: string;
    amount: number | null;
    notes: string | null;
    uploaded_by: string;
    created_at: string;
    updated_at: string;
};

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const year = searchParams.get("year");

    const reportsQuery = supabase
        .from("travel_expense_reports")
        .select("id, payroll_period_id, employee_name, destination, trip_purpose, start_date, end_date, amount_requested, amount_approved, status, approval_notes, approved_by, approved_at, created_by, updated_by, created_at, updated_at")
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false });

    if (status && status !== "all") {
        reportsQuery.eq("status", status);
    }

    if (year) {
        reportsQuery.gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`);
    }

    const { data: reports, error } = await reportsQuery;
    if (error) throw error;

    const reportRows = (reports ?? []) as ReportRow[];
    const reportIds = reportRows.map((r) => r.id);
    const payrollIds = Array.from(
        new Set(
            reportRows
                .map((r) => r.payroll_period_id)
                .filter(Boolean)
        )
    );

    const [{ data: receipts, error: receiptsError }, { data: periods, error: periodsError }] = await Promise.all([
        reportIds.length
            ? supabase
                .from("travel_expense_receipts")
                .select("id, report_id, file_name, file_type, file_url, amount, notes, uploaded_by, created_at, updated_at")
                .eq("org_id", member.org_id)
                .in("report_id", reportIds)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        payrollIds.length
            ? supabase
                .from("payroll_periods")
                .select("id, name")
                .eq("org_id", member.org_id)
                .in("id", payrollIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    if (receiptsError) throw receiptsError;
    if (periodsError) throw periodsError;

    const receiptRows = (receipts ?? []) as ReceiptRow[];
    const receiptMap = groupReceiptsByReport(receiptRows);
    const periodMap = new Map((periods ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));

    const hydrated = reportRows.map((report) => {
        const reportReceipts = receiptMap.get(report.id) ?? [];
        const receiptsTotal = reportReceipts.reduce((sum: number, item: ReceiptRow) => sum + Number(item.amount ?? 0), 0);
        return {
            ...report,
            payroll_period_name: report.payroll_period_id ? periodMap.get(report.payroll_period_id) ?? null : null,
            receipts: reportReceipts,
            receipts_total: receiptsTotal,
        };
    });

    const summary = {
        total_reports: hydrated.length,
        pending_count: hydrated.filter((r) => r.status === "pending").length,
        approved_count: hydrated.filter((r) => r.status === "approved").length,
        reimbursed_count: hydrated.filter((r) => r.status === "reimbursed").length,
        requested_total: hydrated.reduce((sum, r) => sum + Number(r.amount_requested ?? 0), 0),
        approved_total: hydrated.reduce((sum, r) => sum + Number(r.amount_approved ?? 0), 0),
        receipts_total: hydrated.reduce((sum, r) => sum + Number(r.receipts_total ?? 0), 0),
    };

    return NextResponse.json({ reports: hydrated, summary });
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const payload = parsed.data;

    const { data, error } = await supabase
        .from("travel_expense_reports")
        .insert({
            org_id: member.org_id,
            payroll_period_id: payload.payroll_period_id ?? null,
            employee_name: payload.employee_name,
            destination: payload.destination,
            trip_purpose: payload.trip_purpose,
            start_date: payload.start_date,
            end_date: payload.end_date,
            amount_requested: payload.amount_requested,
            status: "pending",
            created_by: user.id,
            updated_by: user.id,
        })
        .select("id, payroll_period_id, employee_name, destination, trip_purpose, start_date, end_date, amount_requested, amount_approved, status, approval_notes, approved_by, approved_at, created_by, updated_by, created_at, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "travel_expense_reports",
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ report: { ...data, receipts: [], receipts_total: 0 } }, { status: 201 });
}, { module: "finanzas", action: "edit" });

