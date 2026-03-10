import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const { data: updatedOrder, error } = await supabase
        .from("purchase_orders")
        .update({
            ...body,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
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
