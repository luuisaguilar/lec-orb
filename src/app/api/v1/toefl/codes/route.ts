import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canView = await checkServerPermission(supabase, user.id, "examenes", "view");
        if (!canView) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { data: codes, error } = await supabase
            .from("toefl_codes")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ codes });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

const bulkToeflCodeSchema = z.object({
    test_type: z.string().min(1),
    quantity: z.number().min(1).max(500),
    purchase_order_id: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = bulkToeflCodeSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canEdit = await checkServerPermission(supabase, user.id, "examenes", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions to create" }, { status: 403 });
        }

        const d = parsed.data;
        const now = new Date();
        const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timestamp = now.getTime().toString().slice(-6);

        // Prepare the array of objects to insert
        const codesToInsert = Array.from({ length: d.quantity }).map((_, index) => {
            const sequence = (index + 1).toString().padStart(3, '0');
            const folio = `TFL-${datePrefix}-${timestamp}-${sequence}`;
            const uniqId = `LEC-${datePrefix}${timestamp}${sequence}`;

            return {
                folio: folio,
                system_uniq_id: uniqId,
                test_type: d.test_type,
                purchase_order_id: d.purchase_order_id || null,
                status: "AVAILABLE",
                created_by: user.id,
            };
        });

        // Insert in bulk
        const { data: newCodes, error } = await supabase
            .from("toefl_codes")
            .insert(codesToInsert)
            .select();

        if (error) {
            return NextResponse.json({ error: "Failed to create codes: " + error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: `Successfully created ${newCodes.length} empty slots.`,
            codes: newCodes
        }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
