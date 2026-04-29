import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

// ─── Schemas ───────────────────────────────────────────────────────────────

const poaLineSchema = z.object({
    year:             z.number().int().min(2020).max(2100),
    month:            z.number().int().min(1).max(12),
    source:           z.enum(["CAJA_CHICA", "CUENTA_BAC"]),
    section:          z.string().min(1).default("General"),
    concept:          z.string().min(1),
    budgeted_amount:  z.number().min(0).default(0),
    real_amount:      z.number().min(0).nullable().optional(),
    notes:            z.string().nullable().optional(),
    sort_order:       z.number().int().default(0),
});

const bulkPoaSchema = z.array(poaLineSchema);

// ─── GET  /api/v1/finance/poa ───────────────────────────────────────────────
// Query params:
//   year    (required)
//   source  CAJA_CHICA | CUENTA_BAC  (optional — omitir devuelve ambas)
//   month   1-12                     (optional — omitir devuelve todos los meses)
//
// Response:
//   { lines: PoaLine[], grouped: { [section]: { [concept]: { [month]: PoaLine } } } }

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const year   = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));
    const source = searchParams.get("source");  // optional filter
    const month  = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

    let query = supabase
        .from("poa_lines")
        .select("*")
        .eq("org_id", member.org_id)
        .eq("year", year)
        .order("section",   { ascending: true })
        .order("sort_order",{ ascending: true })
        .order("concept",   { ascending: true });

    if (source) query = query.eq("source", source);
    if (month)  query = query.eq("month", month);

    const { data: lines, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Build grouped structure:
    // { section → { concept → { month(1-12) → line } } }
    const grouped: Record<string, Record<string, Record<number, typeof lines[0]>>> = {};
    for (const line of lines ?? []) {
        if (!grouped[line.section]) grouped[line.section] = {};
        if (!grouped[line.section][line.concept]) grouped[line.section][line.concept] = {};
        grouped[line.section][line.concept][line.month] = line;
    }

    return NextResponse.json({ lines: lines ?? [], grouped });
}, { module: "finanzas", action: "view" });

// ─── POST /api/v1/finance/poa ──────────────────────────────────────────────
// Body: single PoaLine OR array of PoaLines
// Upsert por (org_id, year, month, source, concept)

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const isArray = Array.isArray(body);
    const parsed  = isArray
        ? bulkPoaSchema.safeParse(body)
        : poaLineSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos inválidos", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const entries = (isArray ? parsed.data as z.infer<typeof poaLineSchema>[] : [parsed.data as z.infer<typeof poaLineSchema>])
        .map(e => ({
            ...e,
            org_id:     member.org_id,
            created_by: user.id,
            updated_at: new Date().toISOString(),
        }));

    const { data: upserted, error } = await supabase
        .from("poa_lines")
        .upsert(entries, { onConflict: "org_id,year,month,source,concept" })
        .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id:      member.org_id,
        table_name:  "poa_lines",
        record_id:   "batch",
        action:      "UPDATE",
        new_data:    upserted,
        performed_by: user.id,
    });

    return NextResponse.json({ lines: upserted }, { status: 200 });
}, { module: "finanzas", action: "edit" });
