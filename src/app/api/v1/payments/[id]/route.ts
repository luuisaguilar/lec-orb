import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const { data: updatedPayment, error } = await supabase
        .from("payments")
        .update({
            status: body.status,
            notes: body.notes,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ payment: updatedPayment });
}, { module: "payments", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("payments")
        .update({ is_active: false })
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ message: "Payment deleted successfully" });
}, { module: "payments", action: "delete" });
