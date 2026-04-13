import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const { data: updatedMovement, error } = await supabase
        .from("petty_cash_movements")
        .update({
            ...body,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*, petty_cash_categories(name, slug)")
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

    return NextResponse.json({ movement: updatedMovement });
}, { module: "finanzas", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("petty_cash_movements")
        .update({ 
            deleted_at: new Date().toISOString(),
            updated_by: user.id,
        })
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "petty_cash_movements",
        record_id: id,
        action: "DELETE",
        new_data: { deleted_at: new Date().toISOString() },
        performed_by: user.id,
    });

    return NextResponse.json({ message: "Movement deleted successfully" });
}, { module: "finanzas", action: "delete" });
