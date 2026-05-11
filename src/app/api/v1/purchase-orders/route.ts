import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { resolveFolioForInsert } from "@/lib/finance/next-folio";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: orders, error } = await supabase
        .from("purchase_orders")
        .select("*, quotes(folio)")
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ orders });
}, { module: "purchase-orders", action: "view" });

const createOrderSchema = z.object({
    folio: z.string().optional().nullable(),
    quote_id: z.string().uuid().optional().nullable(),
    provider: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    file_path: z.string().optional().nullable(),
    status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional().default("PENDING"),
});

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const folioResult = await resolveFolioForInsert(supabase, member.org_id, "PO", parsed.data.folio);
    if ("error" in folioResult) {
        return NextResponse.json({ error: folioResult.error }, { status: folioResult.status });
    }

    const { data: newOrder, error } = await supabase
        .from("purchase_orders")
        .insert({
            org_id: member.org_id,
            folio: folioResult.folio,
            quote_id: parsed.data.quote_id ?? null,
            provider: parsed.data.provider ?? null,
            description: parsed.data.description ?? null,
            file_path: parsed.data.file_path ?? null,
            status: parsed.data.status ?? "PENDING",
            created_by: user.id,
            updated_by: user.id,
        })
        .select()
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "purchase_orders",
        record_id: newOrder.id,
        action: "INSERT",
        new_data: newOrder,
        performed_by: user.id,
    });

    return NextResponse.json({ order: newOrder }, { status: 201 });
}, { module: "purchase-orders", action: "edit" });
