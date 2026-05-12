import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const quotePatchSchema = z
    .object({
        provider: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        file_path: z.string().optional().nullable(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
        currency: z.string().length(3).optional(),
        valid_until: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        supplier_id: z.string().uuid().optional().nullable(),
    })
    .strict();

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data: quote, error } = await supabase
        .from("quotes")
        .select("*, quote_items(*)")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .maybeSingle();

    if (error) throw error;
    if (!quote) {
        return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    const rawItems = (quote.quote_items as unknown[]) ?? [];
    const items = [...rawItems].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return NextResponse.json({ quote: { ...quote, quote_items: items } });
}, { module: "quotes", action: "view" });

export const PATCH = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const raw = await req.json();
    const parsed = quotePatchSchema.safeParse(raw);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const patch = { ...parsed.data, updated_by: user.id, updated_at: new Date().toISOString() };

    const { data: updatedQuote, error } = await supabase
        .from("quotes")
        .update(patch)
        .eq("id", id)
        .eq("org_id", member.org_id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ quote: updatedQuote });
}, { module: "quotes", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;

    const { error } = await supabase
        .from("quotes")
        .update({ is_active: false, updated_by: user.id })
        .eq("id", id)
        .eq("org_id", member.org_id);

    if (error) throw error;
    return NextResponse.json({ message: "Quote deleted successfully" });
}, { module: "quotes", action: "delete" });
