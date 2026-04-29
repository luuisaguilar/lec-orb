import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const movementSchema = z.object({
    org_id: z.string().uuid(),
    category_id: z.string().uuid(),
    date: z.string(),
    concept: z.string().min(1),
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.number().positive(),
    partial_amount: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    receipt_url: z.string().optional().nullable(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id") || member.org_id;
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    const query = supabase
        .from("petty_cash_movements")
        .select("*, petty_cash_categories(name, slug)", { count: "exact" })
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    // Filters
    const categoryId = searchParams.get("category_id");
    if (categoryId) query.eq("category_id", categoryId);

    const type = searchParams.get("type");
    if (type) query.eq("type", type);

    const search = searchParams.get("search");
    if (search) query.ilike("concept", `%${search}%`);

    const dateFrom = searchParams.get("date_from");
    if (dateFrom) query.gte("date", dateFrom);

    const dateTo = searchParams.get("date_to");
    if (dateTo) query.lte("date", dateTo);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
        movements: data,
        pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil((count || 0) / limit)
        }
    });
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user }) => {
    const body = await req.json();
    const parsed = movementSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { data: movement, error } = await supabase
        .from("petty_cash_movements")
        .insert({
            ...parsed.data,
            created_by: user.id,
            updated_by: user.id,
        })
        .select("*, petty_cash_categories(name, slug)")
        .single();

    if (error) throw error;

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
