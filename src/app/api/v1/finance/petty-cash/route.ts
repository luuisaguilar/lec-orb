import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const movementSelect = `
  id,
  org_id,
  fund_id,
  budget_line_id,
  replenishment_request_id,
  movement_date,
  concept,
  amount_in,
  amount_out,
  balance_after,
  receipt_url,
  registered_by,
  approved_by,
  status,
  metadata,
  created_at,
  updated_at,
  petty_cash_funds(name, current_balance, fiscal_year, status),
  budget_lines(
    id,
    month,
    channel,
    budget_items(code, name, budget_categories(name))
  )
`;

const postSchema = z
    .object({
        org_id: z.string().uuid(),
        fund_id: z.string().uuid(),
        movement_date: z.string().min(1),
        concept: z.string().min(1).max(255),
        amount_in: z.number().min(0).default(0),
        amount_out: z.number().min(0).default(0),
        budget_line_id: z.string().uuid().optional().nullable(),
        receipt_url: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
        const hasIn = data.amount_in > 0;
        const hasOut = data.amount_out > 0;
        if (hasIn === hasOut) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Define amount_in > 0 (ingreso) o amount_out > 0 (egreso), no ambos",
                path: ["amount_in"],
            });
        }
        if (hasOut && !data.budget_line_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "budget_line_id es obligatorio para egresos",
                path: ["budget_line_id"],
            });
        }
    });

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const offset = (page - 1) * limit;

    let query = supabase
        .from("petty_cash_movements")
        .select(movementSelect, { count: "exact" })
        .eq("org_id", orgId);

    const fundId = searchParams.get("fund_id");
    if (fundId) query = query.eq("fund_id", fundId);

    const budgetLineId = searchParams.get("budget_line_id");
    if (budgetLineId) query = query.eq("budget_line_id", budgetLineId);

    const search = searchParams.get("search");
    if (search) query = query.ilike("concept", `%${search}%`);

    const dateFrom = searchParams.get("date_from");
    if (dateFrom) query = query.gte("movement_date", dateFrom);

    const dateTo = searchParams.get("date_to");
    if (dateTo) query = query.lte("movement_date", dateTo);

    query = query
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
        movements: data ?? [],
        pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil((count || 0) / limit),
        },
    });
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.org_id !== member.org_id) {
        return NextResponse.json({ error: "org_id no coincide con la membresía" }, { status: 403 });
    }

    const { data: fund, error: fundError } = await supabase
        .from("petty_cash_funds")
        .select("id, org_id, status, current_balance")
        .eq("id", parsed.data.fund_id)
        .eq("org_id", member.org_id)
        .maybeSingle();

    if (fundError) throw fundError;
    if (!fund || fund.status !== "open") {
        return NextResponse.json({ error: "Fondo inválido o cerrado" }, { status: 400 });
    }

    if (parsed.data.amount_out > 0) {
        const bal = Number(fund.current_balance ?? 0);
        if (parsed.data.amount_out > bal) {
            return NextResponse.json(
                { error: "Saldo insuficiente en el fondo", current_balance: bal },
                { status: 400 }
            );
        }

        const { data: line, error: lineError } = await supabase
            .from("budget_lines")
            .select("id, org_id, item_id, fiscal_year, month, channel")
            .eq("id", parsed.data.budget_line_id!)
            .eq("org_id", member.org_id)
            .maybeSingle();

        if (lineError) throw lineError;
        if (!line) {
            return NextResponse.json({ error: "Partida presupuestal no encontrada" }, { status: 400 });
        }
    }

    const insertRow = {
        org_id: member.org_id,
        fund_id: parsed.data.fund_id,
        budget_line_id: parsed.data.amount_out > 0 ? parsed.data.budget_line_id! : null,
        movement_date: parsed.data.movement_date,
        concept: parsed.data.concept,
        amount_in: parsed.data.amount_in,
        amount_out: parsed.data.amount_out,
        balance_after: 0,
        receipt_url: parsed.data.receipt_url ?? null,
        registered_by: user.id,
        status: "posted" as const,
    };

    const { data: movement, error } = await supabase
        .from("petty_cash_movements")
        .insert(insertRow)
        .select(movementSelect)
        .single();

    if (error) {
        const msg = error.message?.toLowerCase() ?? "";
        if (msg.includes("check") || msg.includes("violates")) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
    }

    await logAudit(supabase, {
        org_id: movement.org_id,
        table_name: "petty_cash_movements",
        record_id: movement.id,
        action: "INSERT",
        new_data: movement,
        performed_by: user.id,
    });

    return NextResponse.json({ movement }, { status: 201 });
}, { module: "finanzas", action: "edit" });
