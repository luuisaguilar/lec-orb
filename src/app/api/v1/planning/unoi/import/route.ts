import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { withAuth } from "@/lib/auth/with-handler";
import { parseIHColegiosWorkbook } from "@/lib/import/cambridge-canonical/parse-ih-colegios";

type PlanningInsert = {
    org_id: string;
    city: string | null;
    project: string;
    school_name: string;
    nivel: string | null;
    exam_type: string;
    students_planned: number | null;
    proposed_date: string;
    date_raw: string | null;
    propuesta: string | null;
    external_status: string | null;
    resultados: string | null;
    planning_status: "proposed";
    source_file: string;
    source_row: number;
    notes: string | null;
};

export const POST = withAuth(async (req, { supabase, member }) => {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const replace = (String(formData.get("replace") ?? "true").toLowerCase() !== "false");

    if (!file) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
        return NextResponse.json({ error: "Only .xlsx/.xls files are supported for now" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const rows = parseIHColegiosWorkbook(workbook);

    const payload: PlanningInsert[] = rows
        .filter((r) => Boolean(r.dateIso))
        .map((r) => ({
            org_id: member.org_id,
            city: r.city || null,
            project: r.proyecto || "UNOi",
            school_name: r.colegio,
            nivel: r.nivel || null,
            exam_type: r.examType,
            students_planned: Number.isFinite(r.studentCount) ? r.studentCount : null,
            proposed_date: r.dateIso!,
            date_raw: r.dateRaw || null,
            propuesta: r.propuesta || null,
            external_status: r.estatus || null,
            resultados: r.resultados || null,
            planning_status: "proposed",
            source_file: file.name,
            source_row: r.rowIndex,
            notes: null,
        }));

    if (replace) {
        const { error: delErr } = await supabase
            .from("unoi_planning_rows")
            .delete()
            .eq("org_id", member.org_id)
            .eq("source_file", file.name);
        if (delErr) throw delErr;
    }

    const { data, error } = await supabase
        .from("unoi_planning_rows")
        .insert(payload)
        .select("id");
    if (error) throw error;

    return NextResponse.json({
        source_file: file.name,
        parsed: rows.length,
        inserted: data?.length ?? 0,
        skipped_without_date: rows.length - payload.length,
        replace,
    });
}, { module: "events", action: "edit" });

