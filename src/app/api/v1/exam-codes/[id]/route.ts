import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const PATCH = withAuth(async (req, { supabase }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    const { data: updatedCode, error } = await supabase
        .from("exam_codes")
        .update({
            ...body,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ code: updatedCode });
}, { module: "exam-codes", action: "edit" });

export const DELETE = withAuth(async (req, { supabase }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("exam_codes")
        .update({ is_active: false })
        .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ message: "Deleted successfully" });
}, { module: "exam-codes", action: "delete" });
