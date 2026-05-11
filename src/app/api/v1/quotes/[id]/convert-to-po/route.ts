import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { resolveFolioForInsert } from "@/lib/finance/next-folio";

export const POST = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id: quoteId } = await params;

    const { data: quote, error: qErr } = await supabase
        .from("quotes")
        .select("*, quote_items(*)")
        .eq("id", quoteId)
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .maybeSingle();

    if (qErr) throw qErr;
    if (!quote) {
        return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    if (quote.status !== "APPROVED") {
        return NextResponse.json(
            { error: "Solo se pueden convertir cotizaciones en estatus APROBADA" },
            { status: 400 }
        );
    }

    const folioResult = await resolveFolioForInsert(supabase, member.org_id, "PO", null);
    if ("error" in folioResult) {
        return NextResponse.json({ error: folioResult.error }, { status: folioResult.status });
    }

    const quoteItems = (quote.quote_items as Record<string, unknown>[]) ?? [];
    quoteItems.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    const { data: newOrder, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
            org_id: member.org_id,
            folio: folioResult.folio,
            quote_id: quote.id,
            provider: quote.provider,
            description: quote.description,
            file_path: quote.file_path,
            status: "PENDING",
            subtotal: Number(quote.subtotal ?? 0),
            taxes: Number(quote.taxes ?? 0),
            currency: (quote.currency as string) || "MXN",
            supplier_id: quote.supplier_id ?? null,
            notes: quote.notes ?? null,
            created_by: user.id,
            updated_by: user.id,
        })
        .select()
        .single();

    if (poErr) throw poErr;

    if (quoteItems.length > 0) {
        const rows = quoteItems.map((qi, i) => ({
            org_id: member.org_id,
            purchase_order_id: newOrder.id,
            quote_item_id: qi.id as string,
            description: String(qi.description ?? ""),
            quantity: Number(qi.quantity ?? 1),
            unit_price: Number(qi.unit_price ?? 0),
            tax_rate: Number(qi.tax_rate ?? 0.16),
            sort_order: i,
        }));
        const { error: itemsErr } = await supabase.from("purchase_order_items").insert(rows);
        if (itemsErr) {
            await supabase
                .from("purchase_orders")
                .update({ is_active: false, updated_by: user.id })
                .eq("id", newOrder.id)
                .eq("org_id", member.org_id);
            throw itemsErr;
        }
    }

    const { data: orderWithItems, error: fetchErr } = await supabase
        .from("purchase_orders")
        .select("*, purchase_order_items(*)")
        .eq("id", newOrder.id)
        .single();

    if (fetchErr) throw fetchErr;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "purchase_orders",
        record_id: newOrder.id,
        action: "INSERT",
        new_data: { ...orderWithItems, converted_from_quote_id: quote.id },
        performed_by: user.id,
        subdomain: "ordenes-compra",
    });

    return NextResponse.json({ order: orderWithItems }, { status: 201 });
}, { module: "purchase-orders", action: "edit" });
