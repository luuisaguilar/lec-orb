import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const createActivitySchema = z.object({
    contact_id: z.string().uuid(),
    opportunity_id: z.string().uuid().optional().nullable(),
    type: z.enum(["call", "email", "meeting", "task", "whatsapp", "note"]).default("note"),
    subject: z.string().trim().min(1).max(300),
    description: z.string().trim().max(5000).optional().nullable(),
    due_date: z.string().optional().nullable(), // ISO string
    assigned_to: z.string().uuid().optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/crm/activities
// List activities with optional filters
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const contactId = url.searchParams.get("contact_id");
    const opportunityId = url.searchParams.get("opportunity_id");
    const status = url.searchParams.get("status");
    const assignedTo = url.searchParams.get("assigned_to");
    const q = url.searchParams.get("q")?.trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

    let query = supabase
        .from("crm_activities")
        .select("*, crm_contacts(id, name, type), crm_opportunities(id, title)", { count: "exact" })
        .eq("org_id", member.org_id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit);

    if (type) query = query.eq("type", type);
    if (contactId) query = query.eq("contact_id", contactId);
    if (opportunityId) query = query.eq("opportunity_id", opportunityId);
    if (status) query = query.eq("status", status);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    if (q) query = query.or(`subject.ilike.%${q}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ activities: data ?? [], total: count ?? 0 });
}, { module: "crm", action: "view" });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/crm/activities
// Create a new activity
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = createActivitySchema.safeParse(body);
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

    const { data: activity, error } = await supabase
        .from("crm_activities")
        .insert({
            org_id: member.org_id,
            contact_id: payload.contact_id,
            opportunity_id: payload.opportunity_id ?? null,
            type: payload.type,
            subject: payload.subject,
            description: payload.description ?? null,
            due_date: payload.due_date ?? null,
            assigned_to: payload.assigned_to ?? null,
            status: "pending",
            created_by: user.id,
        })
        .select("*")
        .single();

    if (error || !activity) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_activities",
        record_id: activity.id,
        action: "INSERT",
        new_data: activity,
        performed_by: user.id,
    });

    return NextResponse.json({ activity }, { status: 201 });
}, { module: "crm", action: "edit" });
