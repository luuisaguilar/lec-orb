import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const { itemId, fromLocationId, toLocationId, quantity } = await req.json();

    if (!itemId || !toLocationId || !quantity) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Start a manual "transaction" flow
    // (Note: In production, this should ideally be a Supabase RPC function for atomicity)

    // Check source stock (if fromLocationId is provided)
    if (fromLocationId) {
        const { data: sourceStock } = await supabase
            .from('inventory_stock')
            .select('quantity')
            .eq('location_id', fromLocationId)
            .eq('item_id', itemId)
            .single();

        if (!sourceStock || sourceStock.quantity < quantity) {
            return NextResponse.json({ error: "Insufficient stock in source location" }, { status: 400 });
        }

        // Decrease source
        await supabase
            .from('inventory_stock')
            .update({ quantity: sourceStock.quantity - quantity })
            .eq('location_id', fromLocationId)
            .eq('item_id', itemId);
    }

    // Increase destination
    const { data: destStock } = await supabase
        .from('inventory_stock')
        .select('quantity')
        .eq('location_id', toLocationId)
        .eq('item_id', itemId)
        .single();

    if (destStock) {
        await supabase
            .from('inventory_stock')
            .update({ quantity: destStock.quantity + quantity })
            .eq('location_id', toLocationId)
            .eq('item_id', itemId);
    } else {
        await supabase
            .from('inventory_stock')
            .insert({
                org_id: member.org_id,
                location_id: toLocationId,
                item_id: itemId,
                quantity: quantity
            });
    }

    // Record Transaction
    const { data: transaction, error: txError } = await supabase
        .from('inventory_transactions')
        .insert({
            org_id: member.org_id,
            item_id: itemId,
            from_location_id: fromLocationId,
            to_location_id: toLocationId,
            type: 'transfer',
            quantity: quantity,
            performed_by: user.id
        })
        .select()
        .single();

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "inventory_transactions",
        record_id: transaction.id,
        action: "INSERT",
        new_data: transaction,
        performed_by: user.id,
    });

    return NextResponse.json({ success: true, transaction });
}, { module: "inventory", action: "edit" });

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
            *,
            inventory_items(name, sku),
            from:inventory_locations!inventory_transactions_from_location_id_fkey(name),
            to:inventory_locations!inventory_transactions_to_location_id_fkey(name)
        `)
        .eq('org_id', member.org_id)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}, { module: "inventory", action: "view" });
