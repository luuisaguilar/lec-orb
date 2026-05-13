import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { resolveFolioForInsert } from "@/lib/finance/next-folio";
import { totalsFromFinanceLines } from "@/lib/finance/quote-lines";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: quotes, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ quotes });
}, { module: "quotes", action: "view" });

const lineItemSchema = z.object({
    description: z.string().min(1),
    quantity: z.coerce.number().nonnegative(),
    unit_price: z.coerce.number().nonnegative(),
    tax_rate: z.coerce.number().min(0).max(1).optional(),
});

const createQuoteSchema = z.object({
    folio: z.string().optional().nullable(),
    provider: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    file_path: z.string().optional().nullable(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional().default("PENDING"),
    currency: z.string().length(3).optional().default("MXN"),
    valid_until: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    supplier_id: z.string().uuid().optional().nullable(),
    prospect_id: z.string().uuid().optional().nullable(),
    items: z.array(lineItemSchema).optional().default([]),
});

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = createQuoteSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const folioResult = await resolveFolioForInsert(supabase, member.org_id, "QUOTE", parsed.data.folio);
    if ("error" in folioResult) {
        return NextResponse.json({ error: folioResult.error }, { status: folioResult.status });
    }

    const items = parsed.data.items ?? [];
    const { subtotal, taxes } = totalsFromFinanceLines(
        items.map((it) => ({
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate,
        }))
    );

    const { data: newQuote, error } = await supabase
        .from("quotes")
        .insert({
            org_id: member.org_id,
            folio: folioResult.folio,
            provider: parsed.data.provider ?? null,
            description: parsed.data.description ?? null,
            file_path: parsed.data.file_path ?? null,
            status: parsed.data.status ?? "PENDING",
            currency: parsed.data.currency ?? "MXN",
            subtotal,
            taxes,
            valid_until: parsed.data.valid_until?.trim() ? parsed.data.valid_until : null,
            notes: parsed.data.notes ?? null,
            supplier_id: parsed.data.supplier_id ?? null,
            prospect_id: parsed.data.prospect_id ?? null,
            created_by: user.id,
            updated_by: user.id,
        })
        .select()
        .single();

    if (error) throw error;

    if (items.length > 0) {
        const rows = items.map((it, i) => ({
            org_id: member.org_id,
            quote_id: newQuote.id,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate ?? 0.16,
            sort_order: i,
        }));
        const { error: itemsError } = await supabase.from("quote_items").insert(rows);
        if (itemsError) {
            await supabase
                .from("quotes")
                .update({ is_active: false, updated_by: user.id })
                .eq("id", newQuote.id)
                .eq("org_id", member.org_id);
            throw itemsError;
        }
    }

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "quotes",
        record_id: newQuote.id,
        action: "INSERT",
        new_data: newQuote,
        performed_by: user.id,
        subdomain: "cotizaciones",
    });

    return NextResponse.json({ quote: newQuote }, { status: 201 });
}, { module: "quotes", action: "edit" });
