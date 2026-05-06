/**
 * Build payload for POST /api/v1/planning/unoi from IH Excel.
 *
 * Usage:
 *   npx tsx scripts/build-unoi-planning-payload.ts --ih="C:\path\IH.xlsx" --out="tmp/unoi-planning-payload.json"
 *
 * Output shape:
 *   { rows: [...] }
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseIHColegiosWorkbook, readIHWorkbookFromPath } from "../src/lib/import/cambridge-canonical/parse-ih-colegios";

function arg(name: string): string | undefined {
    const prefix = `--${name}=`;
    const hit = process.argv.find((a) => a.startsWith(prefix));
    return hit ? hit.slice(prefix.length).replace(/^"|"$/g, "") : undefined;
}

function ensureDate(dateIso: string | null, dateRaw: string): string {
    if (!dateIso) throw new Error(`Could not parse date for row: ${dateRaw}`);
    return dateIso;
}

async function main() {
    const ihPath = arg("ih");
    const outPath = arg("out") ?? "tmp/unoi-planning-payload.json";
    const sourceFile = arg("source-file") ?? "IH COLEGIOS SONORA 2025-2026 (1).xlsx";

    if (!ihPath) {
        console.error('Missing --ih="C:\\path\\IH.xlsx"');
        process.exit(1);
    }

    const wb = readIHWorkbookFromPath(resolve(ihPath));
    const rows = parseIHColegiosWorkbook(wb);

    const payload = {
        rows: rows
            .filter((r) => Boolean(r.dateIso))
            .map((r) => ({
                city: r.city || null,
                project: r.proyecto || "UNOi",
                school_name: r.colegio,
                nivel: r.nivel || null,
                exam_type: r.examType,
                students_planned: r.studentCount,
                proposed_date: ensureDate(r.dateIso, r.dateRaw),
                date_raw: r.dateRaw || null,
                propuesta: r.propuesta || null,
                external_status: r.estatus || null,
                resultados: r.resultados || null,
                planning_status: "proposed" as const,
                source_file: sourceFile,
                source_row: r.rowIndex,
                notes: null,
            })),
    };

    const fullOut = resolve(outPath);
    mkdirSync(dirname(fullOut), { recursive: true });
    writeFileSync(fullOut, JSON.stringify(payload, null, 2), "utf8");

    console.log(
        JSON.stringify(
            {
                output: fullOut,
                totalParsed: rows.length,
                rowsInPayload: payload.rows.length,
                skippedWithoutDate: rows.length - payload.rows.length,
                sample: payload.rows.slice(0, 3),
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

