import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkServerPermission } from "@/lib/auth/permissions";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No ids provided for deletion" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins or people with 'delete' permissions on finanzas can bulk delete
        const canDelete = await checkServerPermission(supabase, user.id, "finanzas", "delete");
        if (!canDelete) {
            return NextResponse.json({ error: "Insufficient permissions to delete payments" }, { status: 403 });
        }

        const { error } = await supabase
            .from("payments")
            .delete()
            .in("id", ids);

        if (error) throw error;

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete payments" }, { status: 500 });
    }
}
