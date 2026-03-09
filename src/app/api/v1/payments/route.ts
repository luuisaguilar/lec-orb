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

        const canView = await checkServerPermission(supabase, user.id, "finanzas", "view");
        if (!canView) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { data: payments, error } = await supabase
            .from("payments")
            .select("*, payment_concepts(concept_key, description)")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ payments });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createPaymentSchema.safeParse(body);

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

        // Fetch user's location to stamp the payment. Limit 1 to avoid 'multiple rows' errors
        const { data: member } = await supabase
            .from("org_members")
            .select("location")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        const person_name = `${d.first_name} ${d.last_name}`;

        const { data: newPayment, error } = await supabase
            .from("payments")
            .insert({
                concept_id: d.mode === "exam" ? d.concept_id : null,
                custom_concept: d.mode === "other" ? d.custom_concept : null,
                folio: d.folio,
                amount: finalAmount,
                person_name, // legacy tracking
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
                location: member?.location || null,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "Failed to create payment: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ payment: newPayment }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
