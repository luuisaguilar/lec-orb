import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const patchSchema = z.object({
    name: z.string().min(1).max(150).optional(),
    contact: z.string().max(150).optional().nullable(),
    email: z.string().max(150).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    website: z.string().max(200).optional().nullable(),
    category: z.string().max(80).optional().nullable(),
    notes: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
});

export const PATCH = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    const { data, error } = await supabase
        .from("suppliers")
        .update(parsed.data)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select().single();

    if (error) throw error;
    return NextResponse.json({ supplier: data });
}, { module: "suppliers", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    if (member.role !== "admin") {
        return NextResponse.json({ error: "Only admins can delete suppliers" }, { status: 403 });
    }

    const { error } = await supabase
        .from("suppliers")
        .update({ is_active: false })
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "suppliers", action: "delete" });
