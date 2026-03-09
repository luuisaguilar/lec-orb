import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit/log";

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

        // Get org_id for scoping
        const { data: member } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();

        const { data: orders, error } = await supabase
            .from("purchase_orders")
            .select("*, quotes(folio)")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ orders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

const createOrderSchema = z.object({
    folio: z.string().min(1),
    quote_id: z.string().uuid().optional().nullable(),
    provider: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    file_path: z.string().optional().nullable(),
    status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional().default("PENDING"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createOrderSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canEdit = await checkServerPermission(supabase, user.id, "finanzas", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions to create" }, { status: 403 });
        }

        // Fetch org_id for multi-tenant scoping
        const { data: member } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const d = parsed.data;

        const { data: newOrder, error } = await supabase
            .from("purchase_orders")
            .insert({
                org_id: member.org_id,
                folio: d.folio,
                quote_id: d.quote_id,
                provider: d.provider,
                description: d.description,
                file_path: d.file_path,
                status: d.status,
                created_by: user.id,
                updated_by: user.id,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "Failed to create order: " + error.message }, { status: 500 });
        }

        await logAudit(supabase, {
            org_id: member.org_id,
            table_name: "purchase_orders",
            record_id: newOrder.id,
            action: "INSERT",
            new_data: newOrder,
            performed_by: user.id,
        });

        return NextResponse.json({ order: newOrder }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
