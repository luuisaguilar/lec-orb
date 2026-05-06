import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { wizardCreateSchema } from "@/lib/planning/wizard";

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json().catch(() => ({}));
    const parsed = wizardCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { rows, planningYear, planningCycle, projectType, createIfMissing } = parsed.data;

    const payload = rows.map((row, i) => ({
        org_id: member.org_id,
        city: row.city ?? null,
        project: row.project || projectType.toUpperCase(),
        school_name: row.school_name,
        nivel: row.nivel ?? null,
        exam_type: row.exam_type,
        students_planned: row.students_planned ?? null,
        proposed_date: row.proposed_date,
        planning_status: "proposed",
        notes: row.notes ?? null,
        source_file: `wizard:${projectType}`,
        source_row: i + 1,
        planning_year: planningYear,
        planning_cycle: planningCycle,
    }));

    const { data: inserted, error: insErr } = await supabase
        .from("unoi_planning_rows")
        .insert(payload)
        .select("id, school_name");
    if (insErr) throw insErr;

    let linked = 0;
    let failed = 0;
    const failures: { id: string; error: string }[] = [];

    for (const row of inserted ?? []) {
        try {
            const baseUrl = new URL(req.url);
            const resp = await fetch(`${baseUrl.origin}/api/v1/planning/unoi/${row.id}/link`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    cookie: req.headers.get("cookie") ?? "",
                },
                body: JSON.stringify({ createIfMissing }),
            });
            if (resp.ok) linked++;
            else {
                failed++;
                const data = await resp.json().catch(() => ({}));
                failures.push({ id: row.id, error: data?.error ?? "Link failed" });
            }
        } catch {
            failed++;
            failures.push({ id: row.id, error: "Link request failed" });
        }
    }

    return NextResponse.json({
        inserted: inserted?.length ?? 0,
        linked,
        failed,
        failures,
    });
}, { module: "events", action: "edit" });
