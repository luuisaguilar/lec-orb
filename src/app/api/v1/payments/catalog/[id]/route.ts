import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const patchSchema = z.object({
    description: z.string().min(1).max(200).optional(),
    concept_key: z.string().min(1).max(50).optional(),
    cost: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    expiration_date: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
});

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    if (!["admin", "supervisor"].includes(member.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const { data, error } = await supabase
        .from("payment_concepts")
        .update(parsed.data)
        .eq("id", id)
        .select().single();

    if (error) throw error;
    return NextResponse.json({ concept: data });
}, { module: "finanzas", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    if (member.role !== "admin") return NextResponse.json({ error: "Only admins can delete concepts" }, { status: 403 });

    const { error } = await supabase
        .from("payment_concepts")
        .update({ is_active: false })
        .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "finanzas", action: "delete" });
