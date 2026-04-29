import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { z } from "zod";

const SEED_TARIFFS = [
    { year: 2023, exam_type: "STARTERS", tariff: 258.80 },
    { year: 2023, exam_type: "MOVERS",   tariff: 267.60 },
    { year: 2023, exam_type: "FLYERS",   tariff: 276.00 },
    { year: 2023, exam_type: "KEY",      tariff: 382.20 },
    { year: 2023, exam_type: "PET",      tariff: 394.80 },
    { year: 2023, exam_type: "FCE",      tariff: 614.80 },
    { year: 2024, exam_type: "STARTERS", tariff: 270.69 },
    { year: 2024, exam_type: "MOVERS",   tariff: 288.79 },
    { year: 2024, exam_type: "FLYERS",   tariff: 298.28 },
    { year: 2024, exam_type: "KEY",      tariff: 409.14 },
    { year: 2024, exam_type: "PET",      tariff: 422.93 },
    { year: 2024, exam_type: "FCE",      tariff: 663.10 },
    { year: 2025, exam_type: "STARTERS", tariff: 275.69 },
    { year: 2025, exam_type: "MOVERS",   tariff: 293.79 },
    { year: 2025, exam_type: "FLYERS",   tariff: 303.28 },
    { year: 2025, exam_type: "KEY",      tariff: 543.14 },
    { year: 2025, exam_type: "PET",      tariff: 556.93 },
    { year: 2025, exam_type: "FCE",      tariff: 787.10 },
    { year: 2026, exam_type: "STARTERS", tariff: 332.00 },
    { year: 2026, exam_type: "MOVERS",   tariff: 354.00 },
    { year: 2026, exam_type: "FLYERS",   tariff: 366.00 },
    { year: 2026, exam_type: "KEY",      tariff: 499.00 },
    { year: 2026, exam_type: "PET",      tariff: 516.00 },
    { year: 2026, exam_type: "FCE",      tariff: 812.00 },
];

const TariffSchema = z.object({
    year:      z.number().int().min(2020),
    exam_type: z.string().min(1),
    tariff:    z.number().positive(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    let query = supabase
        .from("ih_tariffs")
        .select("*")
        .eq("org_id", member.org_id)
        .order("year", { ascending: false })
        .order("exam_type");

    if (year) query = query.eq("year", Number(year));

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}, { module: "finanzas", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();

    // Modo seed: cargar historial completo de tarifas
    if (body.seed === true) {
        const payload = SEED_TARIFFS.map(t => ({ ...t, org_id: member.org_id }));
        const { error } = await supabase
            .from("ih_tariffs")
            .upsert(payload, { onConflict: "org_id,year,exam_type" });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await logAudit(supabase, {
            org_id: member.org_id, table_name: "ih_tariffs", record_id: "seed",
            action: "INSERT", new_data: { count: payload.length }, performed_by: user.id,
        });
        return NextResponse.json({ seeded: payload.length });
    }

    // Modo individual: upsert de una tarifa
    const parsed = TariffSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { data, error } = await supabase
        .from("ih_tariffs")
        .upsert({ ...parsed.data, org_id: member.org_id }, { onConflict: "org_id,year,exam_type" })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_tariffs", record_id: data.id,
        action: "INSERT", new_data: data, performed_by: user.id,
    });
    return NextResponse.json(data, { status: 201 });
}, { module: "finanzas", action: "edit" });
