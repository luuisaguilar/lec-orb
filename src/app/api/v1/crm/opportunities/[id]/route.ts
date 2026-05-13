import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateOpportunitySchema = z.object({
    title: z.string().trim().min(1).max(300).optional(),
    stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
    expected_amount: z.number().min(0).optional(),
    probability: z.number().int().min(0).max(100).optional(),
    expected_close: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    loss_reason: z.string().trim().max(500).optional().nullable(),
    quote_id: z.string().uuid().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/crm/opportunities/[id]
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(async (req, { supabase, member }) => {
    const id = req.url.split("/crm/opportunities/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "Missing opportunity ID" }, { status: 400 });

    const { data: opportunity, error } = await supabase
        .from("crm_opportunities")
        .select("*, crm_contacts(id, name, type, email, phone, school_id)")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error || !opportunity) {
        return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // Fetch related activities
    const { data: activities } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("opportunity_id", id)
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false })
        .limit(30);

    return NextResponse.json({ opportunity, activities: activities ?? [] });
}, { module: "crm", action: "view" });

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/crm/opportunities/[id]
// Update opportunity — handles stage transitions (won/lost timestamps)
// ─────────────────────────────────────────────────────────────────────────────

export const PATCH = withAuth(async (req, { supabase, member, user }) => {
    const id = req.url.split("/crm/opportunities/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "Missing opportunity ID" }, { status: 400 });

    const body = await req.json();
    const parsed = updateOpportunitySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    // Get old data for audit and stage transition logic
    const { data: oldOpp } = await supabase
        .from("crm_opportunities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (!oldOpp) {
        return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    // Stage transition logic
    if (updates.stage) {
        if (updates.stage === "won" && oldOpp.stage !== "won") {
            updates.won_at = new Date().toISOString();
            updates.probability = 100;
            updates.lost_at = null;
            updates.loss_reason = null;
        } else if (updates.stage === "lost" && oldOpp.stage !== "lost") {
            updates.lost_at = new Date().toISOString();
            updates.probability = 0;
            updates.won_at = null;
        } else if (updates.stage !== "won" && updates.stage !== "lost") {
            // Reopening — clear outcome timestamps
            updates.won_at = null;
            updates.lost_at = null;
            updates.loss_reason = null;
        }
    }

    const { data: opportunity, error } = await supabase
        .from("crm_opportunities")
        .update(updates)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !opportunity) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_opportunities",
        record_id: opportunity.id,
        action: "UPDATE",
        old_data: oldOpp,
        new_data: opportunity,
        performed_by: user.id,
    });

    return NextResponse.json({ opportunity });
}, { module: "crm", action: "edit" });

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/crm/opportunities/[id]
// Hard delete (opportunities are not soft-deleted)
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE = withAuth(async (req, { supabase, member, user }) => {
    const id = req.url.split("/crm/opportunities/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "Missing opportunity ID" }, { status: 400 });

    const { data: oldOpp } = await supabase
        .from("crm_opportunities")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (!oldOpp) {
        return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const { error } = await supabase
        .from("crm_opportunities")
        .delete()
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_opportunities",
        record_id: id,
        action: "DELETE",
        old_data: oldOpp,
        performed_by: user.id,
    });

    return NextResponse.json({ success: true });
}, { module: "crm", action: "edit" });
