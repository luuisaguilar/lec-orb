import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkServerPermission } from "@/lib/auth/permissions";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canEdit = await checkServerPermission(supabase, user.id, "examenes", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions to edit" }, { status: 403 });
        }

        const { data: updatedCode, error } = await supabase
            .from("exam_codes")
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "Failed to update: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ code: updatedCode });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canDelete = await checkServerPermission(supabase, user.id, "examenes", "delete");
        if (!canDelete) {
            return NextResponse.json({ error: "Insufficient permissions to delete" }, { status: 403 });
        }

        const { error } = await supabase
            .from("exam_codes")
            .update({ is_active: false })
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: "Failed to delete: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
