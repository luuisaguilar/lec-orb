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

        const canEdit = await checkServerPermission(supabase, user.id, "finanzas", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions to edit" }, { status: 403 });
        }

        const { data: updatedQuote, error } = await supabase
            .from("quotes")
            .update({
                ...body,
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "Failed to update quote: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ quote: updatedQuote });
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

        const canDelete = await checkServerPermission(supabase, user.id, "finanzas", "delete");
        if (!canDelete) {
            return NextResponse.json({ error: "Insufficient permissions to delete" }, { status: 403 });
        }

        const { error } = await supabase
            .from("quotes")
            .update({ is_active: false, updated_by: user.id })
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: "Failed to delete quote: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Quote deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
