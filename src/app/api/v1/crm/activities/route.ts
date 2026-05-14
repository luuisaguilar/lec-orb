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

const activityTypes = ["call", "email", "meeting", "task", "whatsapp", "note"] as const;
const activityStatuses = ["pending", "done", "cancelled"] as const;

/** Strip SQL LIKE wildcards from user input so ilike patterns stay predictable. */
function sanitizeIlikeTerm(raw: string): string {
    // Commas break PostgREST `or=(...)` filter lists; LIKE wildcards are stripped for predictable matching.
    return raw.replace(/\\/g, "").replace(/%/g, "").replace(/_/g, "").replace(/,/g, " ").trim();
}

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const typeRaw = url.searchParams.get("type");
    const contactIdRaw = url.searchParams.get("contact_id");
    const opportunityIdRaw = url.searchParams.get("opportunity_id");
    const statusRaw = url.searchParams.get("status");
    const assignedToRaw = url.searchParams.get("assigned_to");
    const qRaw = url.searchParams.get("q")?.trim() ?? "";

    const limitParam = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offsetParam = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 50), 100);
    const offset = Math.max(0, Number.isFinite(offsetParam) ? offsetParam : 0);

    const type =
        typeRaw && activityTypes.includes(typeRaw as (typeof activityTypes)[number])
            ? (typeRaw as (typeof activityTypes)[number])
            : null;
    const status =
        statusRaw && activityStatuses.includes(statusRaw as (typeof activityStatuses)[number])
            ? (statusRaw as (typeof activityStatuses)[number])
            : null;

    const contactParsed = contactIdRaw?.trim()
        ? z.string().uuid().safeParse(contactIdRaw.trim())
        : null;
    const contactId = contactParsed?.success ? contactParsed.data : null;

    const opportunityParsed = opportunityIdRaw?.trim()
        ? z.string().uuid().safeParse(opportunityIdRaw.trim())
        : null;
    const opportunityId = opportunityParsed?.success ? opportunityParsed.data : null;

    const assignedParsed = assignedToRaw?.trim()
        ? z.string().uuid().safeParse(assignedToRaw.trim())
        : null;
    const assignedTo = assignedParsed?.success ? assignedParsed.data : null;

    const searchTerm = sanitizeIlikeTerm(qRaw);

    let query = supabase
        .from("crm_activities")
        .select("*, crm_contacts(id, name, type), crm_opportunities(id, title)", { count: "exact" })
        .eq("org_id", member.org_id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);

    if (type) query = query.eq("type", type);
    if (contactId) query = query.eq("contact_id", contactId);
    if (opportunityId) query = query.eq("opportunity_id", opportunityId);
    if (status) query = query.eq("status", status);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    if (searchTerm.length > 0) {
        const pat = `%${searchTerm}%`;
        query = query.or(`subject.ilike.${pat},description.ilike.${pat}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
        activities: data ?? [],
        total: count ?? 0,
        limit,
        offset,
    });
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
