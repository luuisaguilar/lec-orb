import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const conceptSchema = z.object({
    description: z.string().min(1).max(200),
    concept_key: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, "Key must be uppercase alphanumeric with underscores"),
    cost: z.number().positive(),
    currency: z.string().length(3).default("MXN"),
    expiration_date: z.string().optional().nullable(),
});

export const GET = withAuth(async (req, { supabase }) => {
    const { data: concepts, error } = await supabase
        .from("payment_concepts")
        .select("*")
        .eq("is_active", true)
        .order("description", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ concepts });
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = conceptSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    if (!["admin", "supervisor"].includes(member.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const { data, error } = await supabase
        .from("payment_concepts")
        .insert({ ...parsed.data })
        .select().single();

    if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "Ya existe un concepto con ese código" }, { status: 409 });
        throw error;
    }
    return NextResponse.json({ concept: data }, { status: 201 });
}, { module: "finanzas", action: "edit" });
