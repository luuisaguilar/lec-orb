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

const patchSchema = z.object({
    concept: z.string().min(1).max(255).optional(),
    movement_date: z.string().min(1).optional(),
    receipt_url: z.string().nullable().optional(),
    status: z.enum(["posted", "cancelled"]).optional(),
});

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { data: existing, error: loadError } = await supabase
        .from("petty_cash_movements")
        .select("id, org_id, status")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .maybeSingle();

    if (loadError) throw loadError;
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
        ...parsed.data,
        updated_at: new Date().toISOString(),
    };

    const { data: updatedMovement, error } = await supabase
        .from("petty_cash_movements")
        .update(patch)
        .eq("id", id)
        .eq("org_id", member.org_id)
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
        org_id: member.org_id,
        table_name: "petty_cash_movements",
        record_id: id,
        action: "UPDATE",
        new_data: updatedMovement,
        performed_by: user.id,
    });

    return NextResponse.json({ movement: updatedMovement });
}, { module: "finanzas", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { data: updatedMovement, error } = await supabase
        .from("petty_cash_movements")
        .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select(movementSelect)
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "petty_cash_movements",
        record_id: id,
        action: "UPDATE",
        new_data: updatedMovement,
        performed_by: user.id,
    });

    return NextResponse.json({ movement: updatedMovement, message: "Movimiento cancelado" });
}, { module: "finanzas", action: "delete" });
