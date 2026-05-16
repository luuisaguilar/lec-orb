/**
 * Compares sidebar navigation constants (sidebar-nav.tsx) with coordination docs.
 * Inspired by Cursor cookbook automation — local static check, no API key required.
 *
 * Usage:
 *   npx tsx scripts/check-coordinaciones-sidebar-drift.ts
 *   npm run check:sidebar-docs
 *
 * Exit 0 = aligned; exit 1 = drift detected (suitable for CI).
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const PATHS = {
    sidebarNav: path.join(ROOT, "src/components/sidebar-nav.tsx"),
    auditoria: path.join(ROOT, "docs/wiki/auditoria-coordinaciones-sidebar.md"),
    arquitectura: path.join(ROOT, "docs/COORDINACIONES_LEC_ARQUITECTURA.md"),
    migrationCp: path.join(ROOT, "supabase/migrations/20260614_coordinacion_proyectos_lec.sql"),
} as const;

/** Not module slugs — ignore when scanning backticks in markdown. */
const MD_SLUG_STOPWORDS = new Set([
    "slug",
    "org_id",
    "view",
    "edit",
    "delete",
    "finanzas",
    "documents",
    "module",
    "category",
    "location_id",
    "region",
    "entity",
    "program_projects",
    "exam_sales_lines",
    "PROC_FERIA_LIBRO",
    "SUBPROC_COORD_ACADEMICA",
]);

type DriftIssue = {
    kind: string;
    message: string;
};

function read(file: string): string {
    return fs.readFileSync(file, "utf8");
}

function extractRecordStringKeys(source: string, constName: string): string[] {
    const decl = source.indexOf(`const ${constName}`);
    if (decl < 0) return [];
    const open = source.indexOf("{", decl);
    if (open < 0) return [];
    let depth = 0;
    let close = open;
    for (let i = open; i < source.length; i++) {
        const ch = source[i];
        if (ch === "{") depth++;
        else if (ch === "}") {
            depth--;
            if (depth === 0) {
                close = i;
                break;
            }
        }
    }
    const block = source.slice(open + 1, close);
    const keys: string[] = [];
    const keyRe = /"([^"]+)"\s*:/g;
    let m: RegExpExecArray | null;
    while ((m = keyRe.exec(block)) !== null) {
        keys.push(m[1]);
    }
    return keys;
}

function extractSetLiterals(source: string, constName: string): string[] {
    const re = new RegExp(`const ${constName}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`, "m");
    const inner = source.match(re)?.[1];
    if (!inner) return [];
    const keys: string[] = [];
    const keyRe = /"([a-z0-9-]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = keyRe.exec(inner)) !== null) {
        keys.push(m[1]);
    }
    return keys;
}

function extractHardcodedNavSlugs(source: string): string[] {
    const slugs: string[] = [];
    const moduleRe = /module:\s*"([a-z0-9-]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = moduleRe.exec(source)) !== null) {
        slugs.push(m[1]);
    }
    return [...new Set(slugs)];
}

function extractDepartmentsFromMigration(sql: string): string[] {
    const block = sql.match(/INSERT INTO public\.lec_cp_departments[\s\S]*?VALUES\s*([\s\S]*?)\) AS v\(name, ord\)/)?.[1];
    if (!block) return [];
    const names: string[] = [];
    const rowRe = /\('([^']+)',\s*\d+\)/g;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(block)) !== null) {
        names.push(m[1]);
    }
    return names;
}

function extractDepartmentsFromAuditoria(md: string): string[] {
    const anchor = md.indexOf("**Departamentos**");
    if (anchor < 0) return [];
    const slice = md.slice(anchor, anchor + 600);
    const block = slice.match(/```text\r?\n([\s\S]*?)```/)?.[1];
    if (!block) return [];
    return block
        .split("\n")
        .map((line) => line.replace(/^\d+\s+/, "").trim())
        .filter((line) => line.length > 0 && !line.startsWith("▼"));
}

/** Slugs referenced in auditoría §4 (coordinaciones). */
function extractCoordinationSlugsFromAuditoria(md: string): Set<string> {
    const start = md.indexOf("## 4. Inventario por coordinación");
    const end = md.indexOf("## 5. Matriz");
    const section = start >= 0 && end > start ? md.slice(start, end) : md;
    const found = new Set<string>();
    const tickRe = /`([a-z][a-z0-9-]*)`/g;
    let m: RegExpExecArray | null;
    while ((m = tickRe.exec(section)) !== null) {
        const s = m[1];
        if (MD_SLUG_STOPWORDS.has(s)) continue;
        if (s.length < 2) continue;
        found.add(s);
    }
    return found;
}

/** Canonical coordination slugs we expect documented (§4 tables + hub + feria + académica). */
const EXPECTED_DOC_SLUGS = new Set([
    "unoi-planning",
    "calculator",
    "payroll",
    "ih-billing",
    "toefl",
    "toefl-codes",
    "speaking-packs",
    "cenni",
    "oopt-pdf",
    "ielts",
    "events",
    "event-documents",
    "schools",
    "applicators",
    "inventory",
    "courses",
    "coordinacion-proyectos-lec",
    "project-management",
    "travel-expenses",
]);

function main(): void {
    const issues: DriftIssue[] = [];

    for (const [name, file] of Object.entries(PATHS)) {
        if (!fs.existsSync(file)) {
            issues.push({ kind: "missing-file", message: `Missing ${name}: ${file}` });
        }
    }
    if (issues.some((i) => i.kind === "missing-file")) {
        report(issues);
        process.exit(1);
    }

    const sidebarSrc = read(PATHS.sidebarNav);
    const auditoriaMd = read(PATHS.auditoria);
    const migrationSql = read(PATHS.migrationCp);

    const nativeRoutes = extractRecordStringKeys(sidebarSrc, "NATIVE_ROUTES");
    const categoryIcons = extractRecordStringKeys(sidebarSrc, "CATEGORY_ICONS");
    const sistemaUno = extractSetLiterals(sidebarSrc, "COORD_EXAM_SISTEMA_UNO_SLUGS");
    const toefl = extractSetLiterals(sidebarSrc, "COORD_EXAM_TOEFL_SLUGS");
    const cenni = extractSetLiterals(sidebarSrc, "COORD_EXAM_CENNI_SLUGS");
    const oopt = extractSetLiterals(sidebarSrc, "COORD_EXAM_OOPT_SLUGS");
    const ielts = extractSetLiterals(sidebarSrc, "COORD_EXAM_IELTS_SLUGS");
    const directorio = extractSetLiterals(sidebarSrc, "DIRECTORIO_UNOI_SLUGS");

    const coordExamSlugs = new Set([
        ...sistemaUno,
        ...toefl,
        ...cenni,
        ...oopt,
        ...ielts,
    ]);

    const docSlugs = extractCoordinationSlugsFromAuditoria(auditoriaMd);
    const deptMigration = extractDepartmentsFromMigration(migrationSql);
    const deptAuditoria = extractDepartmentsFromAuditoria(auditoriaMd);

    // —— NATIVE_ROUTES: coordination slugs must exist
    for (const slug of EXPECTED_DOC_SLUGS) {
        if (!nativeRoutes.includes(slug)) {
            issues.push({
                kind: "native-route-missing",
                message: `NATIVE_ROUTES lacks "${slug}" (expected in auditoría §4)`,
            });
        }
    }

    // —— Doc mentions vs code
    for (const slug of EXPECTED_DOC_SLUGS) {
        if (!docSlugs.has(slug) && slug !== "travel-expenses") {
            issues.push({
                kind: "doc-missing-slug",
                message: `auditoria-coordinaciones-sidebar.md §4 does not mention \`${slug}\` (update doc or EXPECTED_DOC_SLUGS)`,
            });
        }
    }

    for (const slug of docSlugs) {
        if (!EXPECTED_DOC_SLUGS.has(slug) && !nativeRoutes.includes(slug)) {
            issues.push({
                kind: "doc-orphan-slug",
                message: `Doc mentions \`${slug}\` but it is not in NATIVE_ROUTES or EXPECTED_DOC_SLUGS`,
            });
        }
    }

    // —— Coordinación exámenes subgroup coverage
    const docExamSlugs = [
        "unoi-planning",
        "calculator",
        "payroll",
        "ih-billing",
        "toefl",
        "toefl-codes",
        "speaking-packs",
        "cenni",
        "oopt-pdf",
        "ielts",
    ];
    for (const slug of docExamSlugs) {
        if (!coordExamSlugs.has(slug)) {
            issues.push({
                kind: "coord-exam-set",
                message: `Slug "${slug}" not in any COORD_EXAM_*_SLUGS set in sidebar-nav.tsx`,
            });
        }
        if (!nativeRoutes.includes(slug)) {
            issues.push({
                kind: "coord-exam-route",
                message: `Slug "${slug}" missing from NATIVE_ROUTES`,
            });
        }
    }

    // —— Hub LEC
    if (!nativeRoutes.includes("coordinacion-proyectos-lec")) {
        issues.push({ kind: "hub", message: "coordinacion-proyectos-lec missing from NATIVE_ROUTES" });
    }
    if (!categoryIcons.includes("Coordinación de proyectos")) {
        issues.push({ kind: "hub", message: 'CATEGORY_ICONS missing "Coordinación de proyectos"' });
    }

    // —— Feria / Académica categories
    if (!categoryIcons.includes("Logística")) {
        issues.push({ kind: "category", message: 'CATEGORY_ICONS missing "Logística" (Feria de libro label)' });
    }
    if (!categoryIcons.includes("Académico")) {
        issues.push({ kind: "category", message: 'CATEGORY_ICONS missing "Académico"' });
    }
    if (!nativeRoutes.includes("inventory")) {
        issues.push({ kind: "feria", message: "inventory slug missing (Feria del Libro)" });
    }
    if (!nativeRoutes.includes("courses")) {
        issues.push({ kind: "academica", message: "courses slug missing (Coordinación Académica)" });
    }

    // —— Departments seed vs auditoría list
    const deptMigrationSet = new Set(deptMigration);
    const deptAuditoriaSet = new Set(deptAuditoria);
    for (const d of deptAuditoria) {
        if (!deptMigrationSet.has(d)) {
            issues.push({
                kind: "departments",
                message: `Department "${d}" in auditoría list but not in migration seed`,
            });
        }
    }
    for (const d of deptMigration) {
        if (!deptAuditoriaSet.has(d)) {
            issues.push({
                kind: "departments",
                message: `Department "${d}" in migration seed but not in auditoría §4.4 block`,
            });
        }
    }

    // —— Directorio slugs
    for (const slug of ["schools", "applicators"]) {
        if (!directorio.includes(slug)) {
            issues.push({ kind: "directorio", message: `DIRECTORIO_UNOI_SLUGS missing "${slug}"` });
        }
    }

    printSummary({
        nativeRoutes: nativeRoutes.length,
        coordExamSlugs: coordExamSlugs.size,
        docSlugs: docSlugs.size,
        departments: deptMigration,
        issues,
    });

    if (issues.length > 0) {
        process.exit(1);
    }
}

function printSummary(data: {
    nativeRoutes: number;
    coordExamSlugs: number;
    docSlugs: number;
    departments: string[];
    issues: DriftIssue[];
}): void {
    console.log("Coordinaciones sidebar ↔ docs drift check\n");
    console.log(`  NATIVE_ROUTES entries:     ${data.nativeRoutes}`);
    console.log(`  COORD_EXAM subgroup slugs: ${data.coordExamSlugs}`);
    console.log(`  Slugs parsed from doc §4:  ${data.docSlugs}`);
    console.log(`  lec_cp_departments seed:   ${data.departments.join(" | ")}`);
    console.log("");

    if (data.issues.length === 0) {
        console.log("OK — sidebar-nav.tsx aligns with auditoria-coordinaciones-sidebar.md (coordination scope).\n");
        return;
    }

    console.log(`Found ${data.issues.length} issue(s):\n`);
    for (const issue of data.issues) {
        console.log(`  [${issue.kind}] ${issue.message}`);
    }
    console.log("\nFix code or update docs/wiki/auditoria-coordinaciones-sidebar.md\n");
}

function report(issues: DriftIssue[]): void {
    for (const issue of issues) {
        console.error(`[${issue.kind}] ${issue.message}`);
    }
}

main();
