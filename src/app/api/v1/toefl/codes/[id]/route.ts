import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const PATCH = withAuth(async (req, { supabase }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    if (body.session_id) body.status = "ASSIGNED";

    const { data: updatedCode, error } = await supabase
        .from("toefl_codes")
        .update({
            ...body,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ code: updatedCode });
}, { module: "toefl-codes", action: "edit" });

export const DELETE = withAuth(async (req, { supabase }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("toefl_codes")
        .update({ is_active: false })
        .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ message: "Deleted successfully" });
}, { module: "toefl-codes", action: "delete" });
