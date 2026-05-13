import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateContactSchema = z.object({
    type: z.enum(["school", "company", "individual"]).optional(),
    name: z.string().trim().min(1).max(300).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().trim().max(30).optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    source: z.enum(["whatsapp", "referral", "web", "fair", "call", "outbound", "existing"]).optional(),
    tags: z.array(z.string()).optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    school_id: z.string().uuid().optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    is_active: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/crm/contacts/[id]
// Get a single contact with related data
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(async (req, { supabase, member }) => {
    const id = req.url.split("/crm/contacts/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "Missing contact ID" }, { status: 400 });

    const { data: contact, error } = await supabase
        .from("crm_contacts")
        .select("*, schools(id, name, contact_name, contact_phone, contact_email)")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (error || !contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch related opportunities
    const { data: opportunities } = await supabase
        .from("crm_opportunities")
        .select("*")
        .eq("contact_id", id)
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false });

    // Fetch related activities
    const { data: activities } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("contact_id", id)
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false })
        .limit(50);

    return NextResponse.json({
        contact,
        opportunities: opportunities ?? [],
        activities: activities ?? [],
    });
}, { module: "crm", action: "view" });

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/crm/contacts/[id]
// Update a contact
// ─────────────────────────────────────────────────────────────────────────────

export const PATCH = withAuth(async (req, { supabase, member, user }) => {
    const id = req.url.split("/crm/contacts/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "Missing contact ID" }, { status: 400 });

    const body = await req.json();
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    // Get old data for audit
    const { data: oldContact } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (!oldContact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const { data: contact, error } = await supabase
        .from("crm_contacts")
        .update(parsed.data)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !contact) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_contacts",
        record_id: contact.id,
        action: "UPDATE",
        old_data: oldContact,
        new_data: contact,
        performed_by: user.id,
    });

    return NextResponse.json({ contact });
}, { module: "crm", action: "edit" });

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/crm/contacts/[id]
// Soft-delete a contact
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE = withAuth(async (req, { supabase, member, user }) => {
    const id = req.url.split("/crm/contacts/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "Missing contact ID" }, { status: 400 });

    const { data: contact, error } = await supabase
        .from("crm_contacts")
        .update({ is_active: false })
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select("*")
        .single();

    if (error || !contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "crm_contacts",
        record_id: contact.id,
        action: "DELETE",
        old_data: contact,
        performed_by: user.id,
    });

    return NextResponse.json({ success: true });
}, { module: "crm", action: "edit" });
