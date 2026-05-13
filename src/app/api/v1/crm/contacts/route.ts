import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const createContactSchema = z.object({
    type: z.enum(["school", "company", "individual"]).default("school"),
    name: z.string().trim().min(1).max(300),
    email: z.string().email().optional().nullable(),
    phone: z.string().trim().max(30).optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    source: z.enum(["whatsapp", "referral", "web", "fair", "call", "outbound", "existing"]).default("existing"),
    tags: z.array(z.string()).optional().default([]),
    assigned_to: z.string().uuid().optional().nullable(),
    school_id: z.string().uuid().optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/crm/contacts
// List contacts with optional filters
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const source = url.searchParams.get("source");
    const q = url.searchParams.get("q")?.trim();
    const assignedTo = url.searchParams.get("assigned_to");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    let query = supabase
        .from("crm_contacts")
        .select("*, schools(name)", { count: "exact" })
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (type) query = query.eq("type", type);
    if (source) query = query.eq("source", source);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ contacts: data ?? [], total: count ?? 0 });
}, { module: "crm", action: "view" });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/crm/contacts
// Create a new contact
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const payload = parsed.data;

    const { data: contact, error } = await supabase
        .from("crm_contacts")
        .insert({
            org_id: member.org_id,
            type: payload.type,
            name: payload.name,
            email: payload.email ?? null,
            phone: payload.phone ?? null,
            address: payload.address ?? null,
            city: payload.city ?? null,
            state: payload.state ?? null,
            source: payload.source,
            tags: payload.tags,
            assigned_to: payload.assigned_to ?? null,
            school_id: payload.school_id ?? null,
            notes: payload.notes ?? null,
            created_by: user.id,
        })
        .select("*")
        .single();

    if (error || !contact) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_contacts",
        record_id: contact.id,
        action: "INSERT",
        new_data: contact,
        performed_by: user.id,
    });

    return NextResponse.json({ contact }, { status: 201 });
}, { module: "crm", action: "edit" });
