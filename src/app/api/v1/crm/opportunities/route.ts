import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const createOpportunitySchema = z.object({
    contact_id: z.string().uuid(),
    title: z.string().trim().min(1).max(300),
    stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"]).default("new"),
    expected_amount: z.number().min(0).optional().default(0),
    probability: z.number().int().min(0).max(100).optional().default(10),
    expected_close: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    quote_id: z.string().uuid().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/crm/opportunities
// List opportunities with optional filters
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage");
    const contactId = url.searchParams.get("contact_id");
    const assignedTo = url.searchParams.get("assigned_to");
    const q = url.searchParams.get("q")?.trim();

    let query = supabase
        .from("crm_opportunities")
        .select("*, crm_contacts(id, name, type, email, phone)", { count: "exact" })
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false });

    if (stage) query = query.eq("stage", stage);
    if (contactId) query = query.eq("contact_id", contactId);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    if (q) query = query.or(`title.ilike.%${q}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ opportunities: data ?? [], total: count ?? 0 });
}, { module: "crm", action: "view" });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/crm/opportunities
// Create a new opportunity
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = createOpportunitySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const payload = parsed.data;

    // Verify contact belongs to same org
    const { data: contact } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("id", payload.contact_id)
        .eq("org_id", member.org_id)
        .single();

    if (!contact) {
        return NextResponse.json({ error: "Contact not found in this organization" }, { status: 404 });
    }

    const { data: opportunity, error } = await supabase
        .from("crm_opportunities")
        .insert({
            org_id: member.org_id,
            contact_id: payload.contact_id,
            title: payload.title,
            stage: payload.stage,
            expected_amount: payload.expected_amount,
            probability: payload.probability,
            expected_close: payload.expected_close ?? null,
            quote_id: payload.quote_id ?? null,
            assigned_to: payload.assigned_to ?? null,
            notes: payload.notes ?? null,
            created_by: user.id,
        })
        .select("*")
        .single();

    if (error || !opportunity) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_opportunities",
        record_id: opportunity.id,
        action: "INSERT",
        new_data: opportunity,
        performed_by: user.id,
    });

    return NextResponse.json({ opportunity }, { status: 201 });
}, { module: "crm", action: "edit" });
