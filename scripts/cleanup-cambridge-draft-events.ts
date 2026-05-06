/**
 * Cleanup de eventos DRAFT legacy creados por import antiguo (1 evento por examen).
 *
 * Default: dry-run.
 * Uso:
 *   npx tsx scripts/cleanup-cambridge-draft-events.ts --org-id=<uuid>
 *   npx tsx scripts/cleanup-cambridge-draft-events.ts --org-id=<uuid> --apply
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";

function loadEnvLocal() {
    for (const f of [".env.local", ".env"]) {
        const p = resolve(process.cwd(), f);
        if (!existsSync(p)) continue;
        const raw = readFileSync(p, "utf8");
        for (const line of raw.split(/\r?\n/)) {
            const m = line.match(/^([^#=]+)=(.*)$/);
            if (!m) continue;
            const key = m[1].trim();
            let val = m[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (!(key in process.env)) process.env[key] = val;
        }
        break;
    }
}

function arg(name: string): string | undefined {
    const p = `--${name}=`;
    const hit = process.argv.find((a) => a.startsWith(p));
    return hit ? hit.slice(p.length) : undefined;
}

function flag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}

async function main() {
    loadEnvLocal();
    const orgId = arg("org-id");
    const apply = flag("apply");
    if (!orgId) {
        console.error("Falta --org-id=<uuid>");
        process.exit(1);
    }

    const admin = createAdminClient();

    const { data: rows, error } = await admin
        .from("events")
        .select("id,title,exam_type,status,parameters,date")
        .eq("org_id", orgId)
        .eq("status", "DRAFT")
        .neq("exam_type", "MULTI")
        .filter("parameters->>import_source", "eq", "ih_colegios_propuestas_fechas")
        .order("date", { ascending: true });
    if (error) throw error;

    const candidates = rows ?? [];
    console.log(
        JSON.stringify(
            {
                orgId,
                apply,
                candidateCount: candidates.length,
                sample: candidates.slice(0, 12).map((r) => ({
                    id: r.id,
                    exam_type: r.exam_type,
                    date: r.date,
                    title: r.title,
                })),
            },
            null,
            2
        )
    );

    if (!apply) {
        console.log("\nDry-run: no se eliminó nada. Añade --apply para borrar estos eventos.");
        return;
    }

    if (candidates.length === 0) {
        console.log("No hay eventos legacy para eliminar.");
        return;
    }

    const ids = candidates.map((r) => r.id);
    const { error: delErr } = await admin.from("events").delete().in("id", ids);
    if (delErr) throw delErr;

    console.log(`Eliminados ${ids.length} eventos DRAFT legacy.`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

