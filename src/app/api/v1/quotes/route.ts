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

        // Get org_id for scoping (after migration, RLS does this too — defense-in-depth)
        const { data: member } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();

        let query = supabase
            .from("quotes")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        // Filter by org_id if available (requires migration 20240309_finance_org_scoping)
        if (member?.org_id) {
            query = query.eq("org_id", member.org_id);
        }

        const { data: quotes, error } = await query;

        if (error) throw error;

        return NextResponse.json({ quotes });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

const createQuoteSchema = z.object({
    folio: z.string().min(1),
    provider: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    file_path: z.string().optional().nullable(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional().default("PENDING"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createQuoteSchema.safeParse(body);

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
        const { data: orgMember } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
        if (!orgMember) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const d = parsed.data;

        const { data: newQuote, error } = await supabase
            .from("quotes")
            .insert({
                org_id: orgMember.org_id,
                folio: d.folio,
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
            return NextResponse.json({ error: "Failed to create quote: " + error.message }, { status: 500 });
        }

        // Audit log — non-fatal
        await logAudit(supabase, {
            org_id: orgMember.org_id,
            table_name: "quotes",
            record_id: newQuote.id,
            action: "INSERT",
            new_data: newQuote,
            performed_by: user.id,
        });

        return NextResponse.json({ quote: newQuote }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
