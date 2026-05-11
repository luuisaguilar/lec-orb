import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const orderPatchSchema = z
    .object({
        provider: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        file_path: z.string().optional().nullable(),
        status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
        currency: z.string().length(3).optional(),
        supplier_id: z.string().uuid().optional().nullable(),
        expected_delivery: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
    })
    .strict();

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data: order, error } = await supabase
        .from("purchase_orders")
        .select("*, quotes(folio), purchase_order_items(*)")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .maybeSingle();

    if (error) throw error;
    if (!order) {
        return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const raw = (order.purchase_order_items as unknown[]) ?? [];
    const purchase_order_items = [...raw].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return NextResponse.json({ order: { ...order, purchase_order_items } });
}, { module: "purchase-orders", action: "view" });

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const raw = await req.json();
    const parsed = orderPatchSchema.safeParse(raw);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const patch = { ...parsed.data, updated_by: user.id, updated_at: new Date().toISOString() };

    const { data: updatedOrder, error } = await supabase
        .from("purchase_orders")
        .update(patch)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ order: updatedOrder });
}, { module: "purchase-orders", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("purchase_orders")
        .update({ is_active: false, updated_by: user.id })
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ message: "Order deleted successfully" });
}, { module: "purchase-orders", action: "delete" });
