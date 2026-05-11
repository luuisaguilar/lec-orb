import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { withAuth } from "@/lib/auth/with-handler";

function normName(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function num(v: unknown): number {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

export const POST = withAuth(async (req, { supabase, member }) => {
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("multipart/form-data")) {
        return NextResponse.json({ error: "Use multipart/form-data with file + periodId" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const periodId = String(form.get("periodId") ?? "");
    const download = form.get("download") === "1" || form.get("download") === "true";

    if (!(file instanceof Blob) || !periodId) {
        return NextResponse.json({ error: "file and periodId are required" }, { status: 400 });
    }

    const { data: period, error: pErr } = await supabase
        .from("payroll_periods")
        .select("id")
        .eq("id", periodId)
        .eq("org_id", member.org_id)
        .single();
    if (pErr) throw pErr;
    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
        return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });
    }
    const sheet = wb.Sheets[sheetName]!;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const { data: entries, error: eErr } = await supabase
        .from("payroll_entries")
        .select("applicator_id, applicator_name, total")
        .eq("period_id", periodId)
        .eq("org_id", member.org_id);
    if (eErr) throw eErr;

    const systemByName = new Map<string, number>();
    for (const e of entries ?? []) {
        const row = e as { applicator_name: string; total: number | null };
        const k = normName(row.applicator_name);
        systemByName.set(k, (systemByName.get(k) ?? 0) + num(row.total));
    }

    const fileByName = new Map<string, number>();
    for (const r of rows) {
        const keys = Object.keys(r);
        let nameCol: string | null = null;
        let amtCol: string | null = null;
        for (const k of keys) {
            const lk = k.toLowerCase();
            if (/nombre|aplicador|staff|empleado/i.test(lk)) nameCol = k;
            if (/total|importe|monto|amount|pago/i.test(lk)) amtCol = k;
        }
        if (!nameCol || !amtCol) continue;
        const nm = normName(String(r[nameCol] ?? ""));
        if (!nm) continue;
        fileByName.set(nm, (fileByName.get(nm) ?? 0) + num(r[amtCol]));
    }

    const allNames = new Set([...systemByName.keys(), ...fileByName.keys()]);
    const mismatches: {
        applicator: string;
        systemTotal: number;
        fileTotal: number;
        delta: number;
    }[] = [];

    for (const name of allNames) {
        const s = systemByName.get(name) ?? 0;
        const f = fileByName.get(name) ?? 0;
        if (Math.abs(s - f) > 0.5) {
            mismatches.push({ applicator: name, systemTotal: s, fileTotal: f, delta: f - s });
        }
    }

    if (download) {
        const out = mismatches.length
            ? mismatches.map((m) => ({
                  aplicador: m.applicator,
                  total_sistema: m.systemTotal,
                  total_archivo: m.fileTotal,
                  delta: m.delta,
              }))
            : [{ mensaje: "Sin diferencias por nombre de aplicador" }];

        const ws = XLSX.utils.json_to_sheet(out);
        const wb2 = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb2, ws, "Comparacion");
        const outBuf = XLSX.write(wb2, { type: "buffer", bookType: "xlsx" }) as Buffer;
        const u8 = new Uint8Array(outBuf);
        return new NextResponse(u8, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="nomina-comparacion-${periodId.slice(0, 8)}.xlsx"`,
            },
        });
    }

    return NextResponse.json({
        ok: true,
        periodId,
        rowsParsed: rows.length,
        namesMatched: allNames.size,
        mismatchCount: mismatches.length,
        mismatches: mismatches.slice(0, 200),
    });
}, { module: "payroll", action: "edit" });
