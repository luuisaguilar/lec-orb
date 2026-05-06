/**
 * Digitaliza los Excel locales (IH + LOGISTICA UNOi) hacia LEC Orb.
 *
 * Uso:
 *   npx tsx scripts/import-cambridge-canonical.ts --org-id=<UUID> --ih="C:\ruta\IH.xlsx" --logistica="C:\ruta\LOGISTICA.xlsx"
 *
 * Por defecto es simulación (no escribe). Para aplicar:
 *   ... --apply
 *
 * Personal desde logística (requiere eventos IH previos con misma escuela/fecha/examen):
 *   ... --apply --apply-logistica-staff
 *
 * Crea aplicadores si no existen (opcional):
 *   ... --apply --apply-logistica-staff --create-applicators
 *
 * Variables: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY)
 *
 * Solo validar lectura de Excel (sin Supabase):
 *   ... --parse-only --ih=... [--logistica=...]
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";
import { parseIHColegiosWorkbook, readIHWorkbookFromPath } from "../src/lib/import/cambridge-canonical/parse-ih-colegios";
import {
    parseLogisticaWorkbookRegionalSheets,
    readLogisticaWorkbookFromPath,
} from "../src/lib/import/cambridge-canonical/parse-logistica-regional";
import { runCambridgeCanonicalImport } from "../src/lib/import/cambridge-canonical/run-import";
import type { IHApplicationRecord, LogisticaSessionRecord } from "../src/lib/import/cambridge-canonical/types";

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
    return hit ? hit.slice(p.length).replace(/^"|"$/g, "") : undefined;
}

function flag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}

async function main() {
    loadEnvLocal();

    const orgId = arg("org-id");
    const ihPath = arg("ih");
    const logisticaPath = arg("logistica");
    const apply = flag("apply");
    const applyLogisticaStaff = flag("apply-logistica-staff");
    const createApplicators = flag("create-applicators");

    const parseOnly = flag("parse-only");

    if (!parseOnly && !orgId) {
        console.error("Falta --org-id=<uuid de la organización en Orb> (o usa --parse-only)");
        process.exit(1);
    }
    if (!ihPath && !logisticaPath) {
        console.error("Indica al menos --ih= o --logistica= con rutas a los .xlsx locales.");
        process.exit(1);
    }

    let ihRows: IHApplicationRecord[] = [];
    if (ihPath) {
        const wb = readIHWorkbookFromPath(resolve(ihPath));
        ihRows = parseIHColegiosWorkbook(wb);
        console.log(`IH: ${ihRows.length} filas de aplicación parseadas desde ${ihPath}`);
    }

    let logisticaMap = new Map<string, LogisticaSessionRecord[]>();
    if (logisticaPath) {
        const wb = readLogisticaWorkbookFromPath(resolve(logisticaPath));
        logisticaMap = parseLogisticaWorkbookRegionalSheets(wb);
        let n = 0;
        for (const [, v] of logisticaMap) n += v.length;
        console.log(`Logística: ${logisticaMap.size} hojas regionales, ${n} bloques de sesión parseados`);
    }

    if (parseOnly) {
        const sheetCounts = Object.fromEntries([...logisticaMap].map(([k, v]) => [k, v.length]));
        console.log(
            JSON.stringify(
                {
                    ihTotal: ihRows.length,
                    ihSample: ihRows.slice(0, 5),
                    logisticaSheets: sheetCounts,
                },
                null,
                2
            )
        );
        console.log("\n--parse-only: no se contactó Supabase.");
        return;
    }

    const admin = createAdminClient();

    const summary = await runCambridgeCanonicalImport(admin, orgId!, ihRows, logisticaMap, {
        apply,
        createMissingApplicators: createApplicators,
        applyLogisticaStaff: applyLogisticaStaff,
    });

    console.log(JSON.stringify(summary, null, 2));

    if (!apply) {
        console.log("\nSimulación únicamente. Añade --apply para escribir en Supabase.");
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
