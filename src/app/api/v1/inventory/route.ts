import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

export const GET = withAuth(async (req, { supabase, member }) => {
    // Get all items with their related stock records
    const { data, error } = await supabase
        .from('inventory_items')
        .select(`
            *,
            inventory_stock (
                quantity,
                inventory_locations (
                    name,
                    type
                )
            )
        `)
        .eq('org_id', member.org_id)
        .eq('is_active', true);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Transform data for the frontend (calculating totals per type)
    const transformed = data.map((item: any) => {
        let warehouseStock = 0;
        let eventStock = 0;

        item.inventory_stock?.forEach((s: any) => {
            if (s.inventory_locations?.type === 'warehouse') {
                warehouseStock += s.quantity;
            } else {
                eventStock += s.quantity;
            }
        });

        return {
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.category,
            warehouse: warehouseStock,
            fair: eventStock,
            total: warehouseStock + eventStock,
            min: item.min_stock_level
        };
    });

    return NextResponse.json(transformed);
}, { module: "inventory", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    
    const { data, error } = await supabase
        .from('inventory_items')
        .insert({
            ...body,
            org_id: member.org_id
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "inventory_items",
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json(data);
}, { module: "inventory", action: "edit" });
