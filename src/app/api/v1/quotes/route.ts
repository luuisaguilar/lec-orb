import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { resolveFolioForInsert } from "@/lib/finance/next-folio";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: quotes, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("org_id", member.org_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ quotes });
}, { module: "quotes", action: "view" });

const createQuoteSchema = z.object({
    folio: z.string().optional().nullable(),
    provider: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    file_path: z.string().optional().nullable(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional().default("PENDING"),
});

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = createQuoteSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const folioResult = await resolveFolioForInsert(supabase, member.org_id, "QUOTE", parsed.data.folio);
    if ("error" in folioResult) {
        return NextResponse.json({ error: folioResult.error }, { status: folioResult.status });
    }

    const { data: newQuote, error } = await supabase
        .from("quotes")
        .insert({
            org_id: member.org_id,
            folio: folioResult.folio,
            provider: parsed.data.provider ?? null,
            description: parsed.data.description ?? null,
            file_path: parsed.data.file_path ?? null,
            status: parsed.data.status ?? "PENDING",
            created_by: user.id,
            updated_by: user.id,
        })
        .select()
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "quotes",
        record_id: newQuote.id,
        action: "INSERT",
        new_data: newQuote,
        performed_by: user.id,
    });

    return NextResponse.json({ quote: newQuote }, { status: 201 });
}, { module: "quotes", action: "edit" });
