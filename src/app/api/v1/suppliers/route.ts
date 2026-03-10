import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const supplierSchema = z.object({
    name: z.string().min(1).max(150),
    contact: z.string().max(150).optional().nullable(),
    email: z.string().email().max(150).optional().nullable().or(z.literal("")),
    phone: z.string().max(30).optional().nullable(),
    website: z.string().max(200).optional().nullable(),
    category: z.string().max(80).optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("name");

    if (error) throw error;
    return NextResponse.json({ suppliers: data || [] });
}, { module: "suppliers", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...parsed.data, org_id: member.org_id, created_by: user.id })
        .select().single();

    if (error) throw error;
    return NextResponse.json({ supplier: data }, { status: 201 });
}, { module: "suppliers", action: "edit" });
