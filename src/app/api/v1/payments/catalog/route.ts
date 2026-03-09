import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkServerPermission } from "@/lib/auth/permissions";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canView = await checkServerPermission(supabase, user.id, "finanzas", "view");
        if (!canView) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { data: concepts, error } = await supabase
            .from("payment_concepts")
            .select("*")
            .eq("is_active", true)
            .order("description", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ concepts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
