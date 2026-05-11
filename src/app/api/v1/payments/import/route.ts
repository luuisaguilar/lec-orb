import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { withAuth } from "@/lib/auth/with-handler";
import { guardExcelImportBuffer, guardExcelImportSize } from "@/lib/import/xlsx-guard";
import { guardExceljsWorkbook } from "@/lib/import/exceljs-guard";
import { sanitizeImportString, worksheetToJsonRecords } from "@/lib/import/exceljs-sheet-json";
import { z } from "zod";

function mapExcelStatusToDB(excelStatus?: string) {
    switch (excelStatus?.toUpperCase()) {
        case "STPE": return "PENDING";
        case "STPA": return "PAID";
        case "STCA": return "CANCELLED";
        case "STVE": return "EXPIRED";
        default: return "PENDING";
    }
}

function parseExcelAmount(val: any): number {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
        const cleaned = val.replace(/[^0-9.-]+/g, "");
        return parseFloat(cleaned) || 0;
    }
    return 0;
}

const importRowSchema = z.object({
    "ID": z.any().transform(v => v ? String(v) : undefined).catch(undefined),
    "ST.": z.any().transform(v => v ? String(v) : undefined).catch(undefined),
    "NOMBRE COMPLETO": z.any().transform(v => v ? String(v) : "Desconocido").catch("Desconocido"),
    "REFERENCIA": z.any().transform(v => v ? String(v) : undefined).catch(undefined),
    "CONCEPTO": z.any().transform(v => v ? String(v) : "Histórico").catch("Histórico"),
    "FECHA GEN.": z.any().optional(),
    "TOTAL": z.any().transform(parseExcelAmount).catch(0),
    "PAGO EN": z.any().transform(v => v ? String(v) : null).catch(null),
    "SEDE": z.any().transform(v => v ? String(v) : null).catch(null)
}).catchall(z.any());

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const sizeFromFile = guardExcelImportSize(file.size);
    if (!sizeFromFile.ok) {
        return NextResponse.json({ error: sizeFromFile.message }, { status: sizeFromFile.status });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const sizeGuard = guardExcelImportBuffer(buffer);
    if (!sizeGuard.ok) {
        return NextResponse.json({ error: sizeGuard.message }, { status: sizeGuard.status });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);

    const shapeGuard = guardExceljsWorkbook(workbook);
    if (!shapeGuard.ok) {
        return NextResponse.json({ error: shapeGuard.message }, { status: shapeGuard.status });
    }

    const first = workbook.worksheets[0];
    if (!first) return NextResponse.json({ error: "The Excel file has no sheets" }, { status: 400 });

    const rawData = worksheetToJsonRecords(first);

    if (rawData.length === 0) return NextResponse.json({ error: "The Excel file is empty" }, { status: 400 });

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];
    const validRowsToInsert: any[] = [];

    for (const [index, row] of rawData.entries()) {
        try {
            if (!row || Object.keys(row as object).length === 0) continue;
            const parsed = importRowSchema.safeParse(row);
            if (!parsed.success) {
                errorCount++;
                errors.push({ row: index + 2, error: "Invalid row format" });
                continue;
            }

            const d = parsed.data;
            const status = mapExcelStatusToDB(d["ST."]);
            const folioRaw = d["ID"] || d["REFERENCIA"] || `HIST-${Date.now()}-${index}`;
            const folio = sanitizeImportString(folioRaw, 120);

            let createdAt = new Date();
            if (d["FECHA GEN."]) {
                const dateStr = String(d["FECHA GEN."]);
                const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
                if (parts.length === 3) createdAt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                else {
                    const fallbackDate = new Date(dateStr);
                    if (!isNaN(fallbackDate.getTime())) createdAt = fallbackDate;
                }
            }

            const fullName = sanitizeImportString(d["NOMBRE COMPLETO"] || "", 300);
            const nameParts = fullName.split(/\s+/).filter(Boolean);
            const firstName = nameParts.slice(0, Math.max(1, Math.ceil(nameParts.length / 2))).join(" ") || "Desconocido";
            const lastName = nameParts.slice(Math.max(1, Math.ceil(nameParts.length / 2))).join(" ") || "";

            validRowsToInsert.push({
                folio,
                amount: d["TOTAL"],
                person_name: fullName,
                first_name: sanitizeImportString(firstName, 120),
                last_name: sanitizeImportString(lastName, 120),
                custom_concept: sanitizeImportString(d["CONCEPTO"], 500),
                status,
                payment_method: d["PAGO EN"] ? sanitizeImportString(d["PAGO EN"], 200) : null,
                location: d["SEDE"] ? sanitizeImportString(d["SEDE"], 200) : null,
                created_by: user.id,
                org_id: member.org_id,
                created_at: createdAt.toISOString(),
                currency: "MXN",
                quantity: 1,
                discount: 0,
            });
        } catch (err: any) {
            errorCount++;
            errors.push({ row: index + 2, error: err.message });
        }
    }

    const incomingFolios = validRowsToInsert.map(r => r.folio);
    const existingFolios = new Set();
    for (let i = 0; i < incomingFolios.length; i += 100) {
        const { data } = await supabase.from("payments").select("folio").in("folio", incomingFolios.slice(i, i + 100)).eq("org_id", member.org_id);
        if (data) data.forEach((p: { folio: string }) => existingFolios.add(p.folio));
    }

    const finalRows = validRowsToInsert.filter(r => {
        if (existingFolios.has(r.folio)) {
            errorCount++;
            errors.push({ row: "N/A", error: `Folio ${r.folio} already exists` });
            return false;
        }
        return true;
    });

    if (finalRows.length > 0) {
        const { error: insError } = await supabase.from("payments").insert(finalRows);
        if (insError) throw insError;
        successCount += finalRows.length;
    }

    return NextResponse.json({
        success: true, message: `Imported ${successCount} records. Ignored/Failed: ${errorCount}.`,
        successCount, errorCount, errors: errors.slice(0, 50)
    });
}, { module: "finanzas", action: "edit" });
