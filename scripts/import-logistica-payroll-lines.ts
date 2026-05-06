/**
 * Import payroll lines previously exported from LOGISTICA_UNOi into payroll_entries/payroll_line_items.
 *
 * Usage:
 *   npx tsx scripts/import-logistica-payroll-lines.ts --file=payroll-lines.json --org-id=<uuid> --period-id=<uuid> --dry-run
 *   npx tsx scripts/import-logistica-payroll-lines.ts --file=payroll-lines.json --org-id=<uuid> --period-id=<uuid> --apply
 *
 * Notes:
 * - Do NOT use angle brackets in CMD/PowerShell values (e.g. use --org-id=abc..., not --org-id=<abc...>).
 * - This script maps names against `applicators.name` in the same org.
 * - On apply, manual/work lines for target entries are replaced.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { LogisticaPayrollLineRecord } from "../src/lib/import/cambridge-canonical/types";

type ExportPayload = {
    sourceFile: string;
    totalLines: number;
    linesBySheet: Record<string, number>;
    lines: LogisticaPayrollLineRecord[];
};

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
            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (!(key in process.env)) process.env[key] = val;
        }
        break;
    }
}

function arg(name: string): string | undefined {
    const eq = `--${name}=`;
    const withEq = process.argv.find((a) => a.startsWith(eq));
    if (withEq) return withEq.slice(eq.length).replace(/^"|"$/g, "");

    const idx = process.argv.findIndex((a) => a === `--${name}`);
    if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1].replace(/^"|"$/g, "");
    return undefined;
}

function flag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}

function normalizeKey(s: string): string {
    return s
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^A-Z0-9 ]+/g, " ")
        .replace(/\s+/g, " ");
}

function cleanApplicatorInput(rawName: string): string {
    return rawName
        .replace(/-REMOTO/gi, " ")
        .replace(/\(.*?\)/g, " ")
        .replace(/[:;,.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Alias map for common short names from LOGISTICA_UNOi to canonical applicator names in DB.
 * Keys are normalized with normalizeKey().
 */
const NAME_ALIASES: Record<string, string> = {
    "LUPITA ZATARAIN": "LAURA GUADALUPE ZATARAIN NOGALES",
    "MAJO": "MARIA JESUS DOMINGUEZ RAMOS",
    "MARIA JOSE": "MARIA JESUS DOMINGUEZ RAMOS",
    "SELENE M": "SILVIA SELENE MORENO CARRASCO",
    "SELENE MORENO": "SILVIA SELENE MORENO CARRASCO",
    "MARISELA C": "MARISELA CASTILLO HUERTA",
    "VANESSA Z": "YOLANDA MARIA FELIX MIRANDA",
    "VANESSA": "YOLANDA MARIA FELIX MIRANDA",
    "ZULEMA CORBALA": "JANETT HERNANDEZ ARRIAGA",
    "RUTH Q": "RUTH HAYDEE QUINTERO ORTEGA",
    "KAREN": "KAREN LOPEZ DEL CASTILLO",
    "LESLIE": "LESLI FERNANDA MEJIA CHAVEZ",
    "LESLI": "LESLI FERNANDA MEJIA CHAVEZ",
    "GABRIELA DE LA ROSA": "GABRIELA DE LA ROSA ORNELAS",
    "CLAUDIA CAMARENA": "CLAUDIA CAMARENA GOMEZ",
    "MARIA NELLY": "MARIA NELLY GUTIERREZ ARVIZU",
};

const NOISE_TOKENS = new Set([
    "SE",
    "ESCRITO",
    "ORAL",
    "EXAMEN ESCRITO",
    "INVIGILATOR",
    "ADMIN",
    "SUPER",
    "SUPERVISOR",
    "CALIFORNIA",
]);

function resolveInputAlias(rawCleaned: string): string {
    const key = normalizeKey(rawCleaned);
    const alias = NAME_ALIASES[key];
    return alias ? alias : rawCleaned;
}

function isNoiseName(rawCleaned: string): boolean {
    const key = normalizeKey(rawCleaned);
    if (!key) return true;
    return NOISE_TOKENS.has(key);
}

function isLikelyUuid(v: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function parseJsonFile(pathArg: string): ExportPayload {
    const full = resolve(pathArg);
    if (!existsSync(full)) throw new Error(`File not found: ${full}`);
    const raw = readFileSync(full, "utf8");
    const parsed = JSON.parse(raw) as ExportPayload;
    if (!Array.isArray(parsed.lines)) throw new Error("Invalid payload: expected `lines` array");
    return parsed;
}

async function main() {
    loadEnvLocal();

    const file = arg("file");
    const orgId = arg("org-id");
    const periodId = arg("period-id");
    const apply = flag("apply");
    const dryRun = flag("dry-run") || !apply;

    if (!file || !orgId || !periodId) {
        console.error("Usage: --file=<json> --org-id=<uuid> --period-id=<uuid> [--dry-run|--apply]");
        process.exit(1);
    }
    if (orgId.includes("<") || periodId.includes("<")) {
        console.error("Do not use angle brackets in IDs. Example: --org-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
        process.exit(1);
    }
    if (!isLikelyUuid(orgId) || !isLikelyUuid(periodId)) {
        console.error("Invalid UUID format in --org-id or --period-id");
        process.exit(1);
    }

    const payload = parseJsonFile(file);
    const admin = createAdminClient();

    const { data: period, error: periodErr } = await admin
        .from("payroll_periods")
        .select("id, org_id, start_date, end_date")
        .eq("id", periodId)
        .maybeSingle();
    if (periodErr) throw periodErr;
    if (!period) throw new Error(`Payroll period not found: ${periodId}`);
    if (period.org_id !== orgId) {
        throw new Error(`Period ${periodId} belongs to org ${period.org_id}, not ${orgId}`);
    }

    const { data: applicators, error: appErr } = await admin
        .from("applicators")
        .select("id, name, rate_per_hour")
        .eq("org_id", orgId)
        .is("deleted_at", null);
    if (appErr) throw appErr;

    const byName = new Map<string, Array<{ id: string; name: string; rate_per_hour: number | null }>>();
    for (const a of applicators ?? []) {
        const key = normalizeKey(a.name);
        const curr = byName.get(key) ?? [];
        curr.push(a);
        byName.set(key, curr);
    }

    const unresolvedNames = new Map<string, number>();
    const ambiguousNames = new Map<string, number>();
    const ignoredNoiseNames = new Map<string, number>();

    type ResolvedLine = {
        applicator_id: string;
        applicator_name: string;
        role: string | null;
        hours: number;
        rate: number;
        total_amount: number;
        notes: string;
        date_iso: string | null;
    };

    const resolved: ResolvedLine[] = [];
    for (const line of payload.lines) {
        const cleanedBase = cleanApplicatorInput(line.personName);
        if (!cleanedBase) continue;
        if (isNoiseName(cleanedBase)) {
            ignoredNoiseNames.set(cleanedBase, (ignoredNoiseNames.get(cleanedBase) ?? 0) + 1);
            continue;
        }
        const cleaned = resolveInputAlias(cleanedBase);
        if (!cleaned) continue;
        const key = normalizeKey(cleaned);
        const candidates = byName.get(key) ?? [];
        if (candidates.length === 0) {
            unresolvedNames.set(cleanedBase, (unresolvedNames.get(cleanedBase) ?? 0) + 1);
            continue;
        }
        if (candidates.length > 1) {
            ambiguousNames.set(cleanedBase, (ambiguousNames.get(cleanedBase) ?? 0) + 1);
            continue;
        }

        const chosen = candidates[0];
        const rate = line.tariff ?? chosen.rate_per_hour ?? 0;
        const hours =
            line.hours ??
            (rate > 0 && line.subtotal !== null && line.subtotal !== undefined ? line.subtotal / rate : 0);
        const total = line.subtotal ?? Number((hours * rate).toFixed(2));
        const notes = [
            "Importado desde LOGISTICA_UNOi",
            `sheet=${line.sheetName}`,
            `row=${line.sourceRow}`,
            line.activityRaw ? `activity=${line.activityRaw}` : "",
            line.oralExamRaw ? `oral=${line.oralExamRaw}` : "",
            line.writtenExamRaw ? `written=${line.writtenExamRaw}` : "",
        ]
            .filter(Boolean)
            .join(" | ");

        resolved.push({
            applicator_id: chosen.id,
            applicator_name: chosen.name,
            role: line.roleCode,
            hours: Number.isFinite(hours) ? Number(hours.toFixed(2)) : 0,
            rate: Number.isFinite(rate) ? Number(rate.toFixed(2)) : 0,
            total_amount: Number.isFinite(total) ? Number(total.toFixed(2)) : 0,
            notes,
            date_iso: line.workDateIso ?? null,
        });
    }

    const summaryBase = {
        sourceFile: payload.sourceFile,
        exportedLines: payload.totalLines,
        resolvedLines: resolved.length,
        unresolvedCount: unresolvedNames.size,
        ambiguousCount: ambiguousNames.size,
        ignoredNoiseCount: [...ignoredNoiseNames.values()].reduce((sum, c) => sum + c, 0),
        unresolvedSample: [...unresolvedNames.entries()].slice(0, 20).map(([name, c]) => ({ name, count: c })),
        ambiguousSample: [...ambiguousNames.entries()].slice(0, 20).map(([name, c]) => ({ name, count: c })),
        ignoredNoiseSample: [...ignoredNoiseNames.entries()].slice(0, 20).map(([name, c]) => ({ name, count: c })),
    };

    if (dryRun) {
        console.log(
            JSON.stringify(
                {
                    mode: "dry-run",
                    ...summaryBase,
                    sampleResolved: resolved.slice(0, 10),
                },
                null,
                2
            )
        );
        console.log("\nDry-run only. Use --apply to write in Supabase.");
        return;
    }

    const grouped = new Map<
        string,
        {
            applicator_id: string;
            applicator_name: string;
            lines: ResolvedLine[];
            total_hours: number;
            total_amount: number;
            avg_rate: number;
            events_count: number;
        }
    >();

    for (const line of resolved) {
        const key = line.applicator_id;
        const g = grouped.get(key) ?? {
            applicator_id: line.applicator_id,
            applicator_name: line.applicator_name,
            lines: [],
            total_hours: 0,
            total_amount: 0,
            avg_rate: 0,
            events_count: 0,
        };
        g.lines.push(line);
        g.total_hours = Number((g.total_hours + line.hours).toFixed(2));
        g.total_amount = Number((g.total_amount + line.total_amount).toFixed(2));
        grouped.set(key, g);
    }

    for (const g of grouped.values()) {
        g.total_hours = Number(g.total_hours.toFixed(2));
        g.total_amount = Number(g.total_amount.toFixed(2));
        g.avg_rate = g.total_hours > 0 ? Number((g.total_amount / g.total_hours).toFixed(2)) : 0;
        g.events_count = new Set(g.lines.map((l) => `${l.date_iso ?? "no-date"}|${l.role ?? "no-role"}`)).size;
    }

    const entriesPayload = [...grouped.values()].map((g) => ({
        period_id: periodId,
        org_id: orgId,
        applicator_id: g.applicator_id,
        applicator_name: g.applicator_name,
        hours_worked: g.total_hours,
        rate_per_hour: g.avg_rate,
        slots_count: g.lines.length,
        events_count: g.events_count,
        subtotal: g.total_amount,
        adjustments: 0,
        total: g.total_amount,
        status: "pending",
        type: "operational",
    }));

    const { error: upsertErr } = await admin
        .from("payroll_entries")
        .upsert(entriesPayload, { onConflict: "period_id,applicator_id" });
    if (upsertErr) throw upsertErr;

    const { data: entryRows, error: entryErr } = await admin
        .from("payroll_entries")
        .select("id, applicator_id")
        .eq("period_id", periodId)
        .eq("org_id", orgId);
    if (entryErr) throw entryErr;

    const entryByApplicator = new Map((entryRows ?? []).map((e) => [e.applicator_id, e.id]));
    const targetEntryIds = [...entryByApplicator.values()];

    if (targetEntryIds.length > 0) {
        const { error: delErr } = await admin
            .from("payroll_line_items")
            .delete()
            .in("entry_id", targetEntryIds)
            .eq("source", "manual")
            .eq("line_type", "work");
        if (delErr) throw delErr;
    }

    const lineInserts: Array<Record<string, unknown>> = [];
    for (const g of grouped.values()) {
        const entryId = entryByApplicator.get(g.applicator_id);
        if (!entryId) continue;
        for (const line of g.lines) {
            lineInserts.push({
                org_id: orgId,
                entry_id: entryId,
                event_id: null,
                session_id: null,
                event_name: line.date_iso ? `LOGISTICA ${line.date_iso}` : "LOGISTICA",
                role: line.role,
                hours: line.hours,
                rate: line.rate,
                fixed_payment: 0,
                total_amount: line.total_amount,
                line_type: "work",
                source: "manual",
                projected_hours: line.hours,
                projected_rate: line.rate,
                projected_amount: line.total_amount,
                actual_hours: line.hours,
                actual_rate: line.rate,
                actual_amount: line.total_amount,
                is_confirmed: true,
                notes: line.notes,
            });
        }
    }

    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < lineInserts.length; i += chunkSize) {
        const chunk = lineInserts.slice(i, i + chunkSize);
        const { error } = await admin.from("payroll_line_items").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
    }

    console.log(
        JSON.stringify(
            {
                mode: "apply",
                ...summaryBase,
                payrollEntriesUpserted: entriesPayload.length,
                payrollLineItemsInserted: inserted,
            },
            null,
            2
        )
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

