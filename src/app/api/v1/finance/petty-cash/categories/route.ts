import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase }) => {
    const { data: categories, error } = await supabase
        .from("petty_cash_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ categories });
}, { module: "finanzas", action: "view" });
