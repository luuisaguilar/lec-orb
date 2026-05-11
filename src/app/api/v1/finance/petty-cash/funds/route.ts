import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { isFinanceAdminRole } from "@/lib/finance/finance-access";

const createFundSchema = z.object({
    name: z.string().min(1).max(100),
    fiscal_year: z.number().int().min(2000).max(2100),
    initial_amount: z.number().min(0),
    custodian_id: z.string().uuid().optional(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const year = searchParams.get("fiscal_year");
    const status = searchParams.get("status");

    let q = supabase
        .from("petty_cash_funds")
        .select("id, org_id, fiscal_year, name, custodian_id, initial_amount, current_balance, status, opened_at, closed_at, created_at, updated_at")
        .eq("org_id", orgId)
        .order("fiscal_year", { ascending: false })
        .order("name", { ascending: true });

    if (year) q = q.eq("fiscal_year", parseInt(year, 10));
    if (status === "open" || status === "closed") q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ funds: data ?? [] });
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    if (!isFinanceAdminRole(member.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createFundSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const custodianId = parsed.data.custodian_id ?? user.id;
    const initial = parsed.data.initial_amount;

    const { data: fund, error } = await supabase
        .from("petty_cash_funds")
        .insert({
            org_id: member.org_id,
            fiscal_year: parsed.data.fiscal_year,
            name: parsed.data.name,
            custodian_id: custodianId,
            initial_amount: initial,
            current_balance: initial,
            status: "open",
        })
        .select()
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "petty_cash_funds",
        record_id: fund.id,
        action: "INSERT",
        new_data: fund,
        performed_by: user.id,
    });

    return NextResponse.json({ fund }, { status: 201 });
}, { module: "finanzas", action: "edit" });
