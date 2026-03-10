import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const PATCH = withAuth(async (req, { supabase }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    if (body.start_date) {
        body.test_date = body.start_date;
        delete body.start_date;
    }

    const { data: updatedAdmin, error } = await supabase
        .from("toefl_administrations")
        .update({
            ...body,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ administration: updatedAdmin });
}, { module: "examenes", action: "edit" });

export const DELETE = withAuth(async (req, { supabase }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("toefl_administrations")
        .update({ is_active: false })
        .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ message: "Deleted successfully" });
}, { module: "examenes", action: "delete" });
