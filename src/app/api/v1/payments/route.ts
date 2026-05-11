import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: payments, error } = await supabase
        .from("payments")
        .select("*, payment_concepts(concept_key, description)")
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ payments });
}, { module: "finanzas", action: "view" });

const createPaymentSchema = z.object({
    mode: z.enum(["exam", "other"]).default("exam"),
    concept_id: z.string().uuid().or(z.literal("")).optional().nullable(),
    custom_concept: z.string().or(z.literal("")).optional().nullable(),
    folio: z.string().min(1),
    amount: z.number().min(0),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email().or(z.literal("")).optional().nullable(),
    institution: z.string().or(z.literal("")).optional().nullable(),
    quantity: z.number().int().positive().default(1),
    discount: z.number().min(0).default(0),
    currency: z.enum(["MXN", "USD", "EUR"]).default("MXN"),
    payment_method: z.string().min(1),
    notes: z.string().or(z.literal("")).optional().nullable(),
    status: z.enum(["PENDING", "PAID", "EXPIRED", "CANCELLED"]).default("PENDING"),
}).refine(data => {
    if (data.mode === "other" && !data.custom_concept) return false;
    if (data.mode === "exam" && !data.concept_id) return false;
    return true;
}, { message: "Concept is required based on payment mode" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const d = parsed.data;
    let finalAmount = d.amount;

    // Securely re-calculate total if it's an exam based on the DB catalog
    if (d.mode === "exam" && d.concept_id) {
        const { data: concept } = await supabase
            .from("payment_concepts")
            .select("cost")
            .eq("id", d.concept_id)
            .single();
        if (concept) {
            finalAmount = (concept.cost * d.quantity) - d.discount;
        }
    }

    const person_name = `${d.first_name} ${d.last_name}`;

    const { data: newPayment, error } = await supabase
        .from("payments")
        .insert({
            org_id: member.org_id,
            concept_id: d.mode === "exam" ? d.concept_id : null,
            custom_concept: d.mode === "other" ? d.custom_concept : null,
            folio: d.folio,
            amount: finalAmount,
            person_name,
            first_name: d.first_name,
            last_name: d.last_name,
            email: d.email || null,
            institution: d.institution || null,
            quantity: d.quantity,
            discount: d.discount,
            currency: d.currency,
            payment_method: d.payment_method,
            notes: d.notes,
            status: d.status,
            location: member.location || null,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) throw error;

    // Audit log
    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "payments",
        record_id: newPayment.id,
        action: "INSERT",
        new_data: newPayment,
        performed_by: user.id,
    });

    return NextResponse.json({ payment: newPayment }, { status: 201 });
}, { module: "finanzas", action: "edit" });
