import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkServerPermission } from "@/lib/auth/permissions";
import * as xlsx from "xlsx";
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

// Clean and normalize currency strings into numbers
function parseExcelAmount(val: any): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
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
    "FECHA GEN.": z.any().optional(), // Handle various excel date formats later
    "TOTAL": z.any().transform(parseExcelAmount).catch(0),
    "PAGO EN": z.any().transform(v => v ? String(v) : null).catch(null),
    "SEDE": z.any().transform(v => v ? String(v) : null).catch(null)
}).catchall(z.any());

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canEdit = await checkServerPermission(supabase, user.id, "finanzas", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions to import" }, { status: 403 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = xlsx.utils.sheet_to_json(worksheet, { raw: false }); // raw false formats dates nicely occasionally

        if (rawData.length === 0) {
            return NextResponse.json({ error: "The Excel file is empty" }, { status: 400 });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: any[] = [];
        const validRowsToInsert: any[] = [];

        // 1. Process all rows in memory
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

                // Fallback ID generation if missing
                const folio = d["ID"] || d["REFERENCIA"] || `HIST-${Date.now()}-${index}`;

                // Date parsing logic
                let createdAt = new Date();
                if (d["FECHA GEN."]) {
                    const dateStr = String(d["FECHA GEN."]);
                    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
                    if (parts.length === 3) {
                        createdAt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    } else {
                        const fallbackDate = new Date(dateStr);
                        if (!isNaN(fallbackDate.getTime())) createdAt = fallbackDate;
                    }
                }

                const nameParts = (d["NOMBRE COMPLETO"] || "").split(" ");
                const firstName = nameParts.slice(0, Math.max(1, Math.ceil(nameParts.length / 2))).join(" ") || "Desconocido";
                const lastName = nameParts.slice(Math.max(1, Math.ceil(nameParts.length / 2))).join(" ") || "";

                validRowsToInsert.push({
                    folio: folio,
                    amount: d["TOTAL"],
                    person_name: d["NOMBRE COMPLETO"], // legacy column
                    first_name: firstName,
                    last_name: lastName,
                    custom_concept: d["CONCEPTO"],
                    status: status,
                    payment_method: d["PAGO EN"] || null,
                    location: d["SEDE"] || null,
                    created_by: user.id,
                    created_at: createdAt.toISOString(),
                    currency: 'MXN', // Base default
                    quantity: 1,
                    discount: 0
                });

            } catch (err: any) {
                errorCount++;
                errors.push({ row: index + 2, error: err.message });
            }
        }

        // 2. Perform duplicate checks in batches (fetch existing folios)
        const incomingFolios = validRowsToInsert.map(r => r.folio);

        // Break into chunks of 100 for safety against huge IN clauses
        const existingFolios = new Set();
        const chunkSize = 100;
        for (let i = 0; i < incomingFolios.length; i += chunkSize) {
            const chunk = incomingFolios.slice(i, i + chunkSize);
            const { data } = await supabase
                .from("payments")
                .select("folio")
                .in("folio", chunk);

            if (data) data.forEach(p => existingFolios.add(p.folio));
        }

        // 3. Filter out duplicates
        const finalRows = validRowsToInsert.filter(r => {
            if (existingFolios.has(r.folio)) {
                errorCount++;
                errors.push({ row: "N/A", error: `Folio ${r.folio} already exists` });
                return false;
            }
            return true;
        });

        // 4. Batch Insert
        if (finalRows.length > 0) {
            const { error: insertError } = await supabase
                .from("payments")
                .insert(finalRows);

            if (insertError) throw insertError;
            successCount += finalRows.length;
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${successCount} records. Ignored/Failed: ${errorCount}.`,
            successCount,
            errorCount,
            errors: errors.slice(0, 50)
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to process the Excel file" }, { status: 500 });
    }
}
