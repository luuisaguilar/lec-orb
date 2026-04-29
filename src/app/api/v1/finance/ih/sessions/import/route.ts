import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import * as XLSX from "xlsx";

// Columnas esperadas del Excel DESGLOSE:
// No. | COLEGIO | EXAMEN | No. EXAM | TARIFA | SUBTOTAL S/IVA
// Columnas opcionales: REGION, FECHA, STATUS

const EXAM_TYPE_MAP: Record<string, string> = {
    "STARTERS": "STARTERS", "YLE STARTERS": "STARTERS",
    "MOVERS": "MOVERS",     "YLE MOVERS": "MOVERS",
    "FLYERS": "FLYERS",     "YLE FLYERS": "FLYERS",
    "KEY": "KEY",           "KEY FS": "KEY",
    "KET": "KEY",           "KET FS": "KEY",
    "PET": "PET",           "PET FS": "PET",
    "PRELIMINARY": "PET",   "PRELIMINARY FS": "PET",
    "FCE": "FCE",           "FCE FS": "FCE",
};

function normalizeExam(raw: string): string {
    const upper = String(raw ?? "").trim().toUpperCase();
    return EXAM_TYPE_MAP[upper] ?? upper;
}

function parseDate(raw: unknown): string | null {
    if (!raw) return null;
    if (typeof raw === "number") {
        const d = XLSX.SSF.parse_date_code(raw);
        if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const str = String(raw).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return str;
    return null;
}

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const region = (formData.get("region") as string) ?? "SONORA";
    const sessionDate = formData.get("session_date") as string | null;

    if (!file) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    if (!["SONORA", "BAJA_CALIFORNIA"].includes(region)) {
        return NextResponse.json({ error: "Región inválida" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = wb.SheetNames[0];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });

    const sessions: Record<string, unknown>[] = [];
    const skipped: string[] = [];

    for (const row of rows) {
        const schoolName = String(row["COLEGIO"] ?? row["ESCUELA"] ?? "").trim();
        const examRaw    = String(row["EXAMEN"] ?? "").trim();
        const students   = Number(row["No. EXAM"] ?? row["ALUMNOS"] ?? row["NO. EXAM"] ?? 0);
        const tariff     = Number(row["TARIFA"] ?? 0);
        const date       = parseDate(row["FECHA"] ?? sessionDate);

        if (!schoolName || !examRaw || students <= 0 || tariff <= 0) {
            if (schoolName) skipped.push(schoolName);
            continue;
        }
        if (!date) {
            skipped.push(`${schoolName} (sin fecha)`);
            continue;
        }

        sessions.push({
            org_id:           member.org_id,
            school_name:      schoolName,
            exam_type:        normalizeExam(examRaw),
            session_date:     date,
            region,
            students_applied: students,
            tariff,
            status:           "PENDING",
            created_by:       user.id,
        });
    }

    if (sessions.length === 0) {
        return NextResponse.json({ error: "No se encontraron filas válidas en el archivo", skipped }, { status: 422 });
    }

    const { error } = await supabase
        .from("ih_sessions")
        .upsert(sessions, { onConflict: "org_id,school_name,exam_type,session_date", ignoreDuplicates: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_sessions", record_id: "bulk",
        action: "INSERT", new_data: { count: sessions.length, region }, performed_by: user.id,
    });

    return NextResponse.json({ imported: sessions.length, skipped });
}, { module: "finanzas", action: "edit" });
