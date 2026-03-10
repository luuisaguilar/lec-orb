import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: codes, error } = await supabase
        .from("toefl_codes")
        .select("*")
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ codes });
}, { module: "toefl-codes", action: "view" });

const bulkToeflCodeSchema = z.object({
    test_type: z.string().min(1),
    quantity: z.number().min(1).max(500),
    purchase_order_id: z.string().uuid().optional().nullable(),
});

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = bulkToeflCodeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    const d = parsed.data;
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = now.getTime().toString().slice(-6);

    const codesToInsert = Array.from({ length: d.quantity }).map((_, index) => {
        const sequence = (index + 1).toString().padStart(3, '0');
        const folio = `TFL-${datePrefix}-${timestamp}-${sequence}`;
        const uniqId = `LEC-${datePrefix}${timestamp}${sequence}`;

        return {
            org_id: member.org_id,
            folio: folio,
            system_uniq_id: uniqId,
            test_type: d.test_type,
            purchase_order_id: d.purchase_order_id || null,
            status: "AVAILABLE",
            created_by: user.id,
        };
    });

    const { data: newCodes, error } = await supabase
        .from("toefl_codes")
        .insert(codesToInsert)
        .select();

    if (error) throw error;

    return NextResponse.json({
        message: `Successfully created ${newCodes!.length} empty slots.`,
        codes: newCodes
    }, { status: 201 });
}, { module: "toefl-codes", action: "edit" });
