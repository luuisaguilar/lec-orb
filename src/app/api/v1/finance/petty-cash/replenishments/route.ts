import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const createRequestSchema = z.object({
    fund_id: z.string().uuid(),
    requested_amount: z.number().positive(),
    justification: z.string().min(1),
    notes: z.string().optional().nullable(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const fundId = searchParams.get("fund_id");
    const status = searchParams.get("status");

    let q = supabase
        .from("replenishment_requests")
        .select("*, petty_cash_funds(name, fiscal_year, current_balance)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

    if (fundId) q = q.eq("fund_id", fundId);
    if (status === "pending" || status === "approved" || status === "rejected") q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ replenishments: data ?? [] });
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { data: fund, error: fundError } = await supabase
        .from("petty_cash_funds")
        .select("id, org_id, status")
        .eq("id", parsed.data.fund_id)
        .eq("org_id", member.org_id)
        .maybeSingle();

    if (fundError) throw fundError;
    if (!fund || fund.status !== "open") {
        return NextResponse.json({ error: "Invalid or closed fund" }, { status: 400 });
    }

    const { data: row, error } = await supabase
        .from("replenishment_requests")
        .insert({
            org_id: member.org_id,
            fund_id: parsed.data.fund_id,
            requested_amount: parsed.data.requested_amount,
            justification: parsed.data.justification,
            notes: parsed.data.notes ?? null,
            requested_by: user.id,
            status: "pending",
        })
        .select()
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "replenishment_requests",
        record_id: row.id,
        action: "INSERT",
        new_data: row,
        performed_by: user.id,
    });

    return NextResponse.json({ replenishment: row }, { status: 201 });
}, { module: "finanzas", action: "edit" });
