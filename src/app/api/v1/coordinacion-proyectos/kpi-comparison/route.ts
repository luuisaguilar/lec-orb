import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";

const patchSchema = z.object({
    rows: z
        .array(
            z.object({
                id: z.string().uuid(),
                count_2025: z.number().int().min(0).optional(),
                count_2026: z.number().int().min(0).optional(),
                projected_2026: z.number().int().min(0).optional(),
            }),
        )
        .max(20),
});

export const GET = withAuth(async (_req, { supabase, member }) => {
    const { data, error } = await supabase
        .from("lec_kpi_size_comparison")
        .select("*")
        .eq("org_id", member.org_id)
        .order("bucket_key");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
}, { module: CP_MODULE, action: "view" });

export const PATCH = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    for (const row of parsed.data.rows) {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (row.count_2025 !== undefined) patch.count_2025 = row.count_2025;
        if (row.count_2026 !== undefined) patch.count_2026 = row.count_2026;
        if (row.projected_2026 !== undefined) patch.projected_2026 = row.projected_2026;

        const { error } = await supabase
            .from("lec_kpi_size_comparison")
            .update(patch)
            .eq("org_id", member.org_id)
            .eq("id", row.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logAudit(supabase, {
            org_id: member.org_id,
            table_name: "lec_kpi_size_comparison",
            record_id: row.id,
            action: "UPDATE",
            new_data: patch,
            performed_by: user.id,
        });
    }

    return NextResponse.json({ ok: true });
}, { module: CP_MODULE, action: "edit" });
