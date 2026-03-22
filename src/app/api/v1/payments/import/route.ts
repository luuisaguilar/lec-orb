import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import * as xlsx from "xlsx";
import { z } from "zod";

type ImportErrorRow = {
    row: number | string;
    error: string;
};

type PaymentImportRow = {
    folio: string;
    amount: number;
    person_name: string;
    first_name: string;
    last_name: string;
    custom_concept: string;
    status: string;
    payment_method: string | null;
    location: string | null;
    created_by: string;
    org_id: string;
    created_at: string;
    currency: string;
    quantity: number;
    discount: number;
};

type ExistingPaymentFolioRow = {
    folio: string;
};

function mapExcelStatusToDB(excelStatus?: string) {
    switch (excelStatus?.toUpperCase()) {
        case "STPE": return "PENDING";
        case "STPA": return "PAID";
        case "STCA": return "CANCELLED";
        case "STVE": return "EXPIRED";
        default: return "PENDING";
    }
}

function parseExcelAmount(val: unknown): number {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
        const cleaned = val.replace(/[^0-9.-]+/g, "");
        return parseFloat(cleaned) || 0;
    }
    return 0;
}

const importRowSchema = z.object({
    "ID": z.unknown().transform((value) => value ? String(value) : undefined).catch(undefined),
    "ST.": z.unknown().transform((value) => value ? String(value) : undefined).catch(undefined),
    "NOMBRE COMPLETO": z.unknown().transform((value) => value ? String(value) : "Desconocido").catch("Desconocido"),
    "REFERENCIA": z.unknown().transform((value) => value ? String(value) : undefined).catch(undefined),
    "CONCEPTO": z.unknown().transform((value) => value ? String(value) : "HistÃƒÂ³rico").catch("HistÃƒÂ³rico"),
    "FECHA GEN.": z.unknown().optional(),
    "TOTAL": z.unknown().transform(parseExcelAmount).catch(0),
    "PAGO EN": z.unknown().transform((value) => value ? String(value) : null).catch(null),
    "SEDE": z.unknown().transform((value) => value ? String(value) : null).catch(null),
}).catchall(z.unknown());

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const rawData = xlsx.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[workbook.SheetNames[0]],
        { raw: false }
    );

    if (rawData.length === 0) return NextResponse.json({ error: "The Excel file is empty" }, { status: 400 });

    let successCount = 0;
    let errorCount = 0;
    const errors: ImportErrorRow[] = [];
    const validRowsToInsert: PaymentImportRow[] = [];

    for (const [index, row] of rawData.entries()) {
        try {
            if (Object.keys(row).length === 0) continue;

            const parsed = importRowSchema.safeParse(row);
            if (!parsed.success) {
                errorCount++;
                errors.push({ row: index + 2, error: "Invalid row format" });
                continue;
            }

            const data = parsed.data;
            const status = mapExcelStatusToDB(data["ST."]);
            const folio = data["ID"] || data["REFERENCIA"] || `HIST-${Date.now()}-${index}`;

            let createdAt = new Date();
            if (data["FECHA GEN."]) {
                const dateStr = String(data["FECHA GEN."]);
                const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
                if (parts.length === 3) {
                    createdAt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                } else {
                    const fallbackDate = new Date(dateStr);
                    if (!Number.isNaN(fallbackDate.getTime())) createdAt = fallbackDate;
                }
            }

            const nameParts = data["NOMBRE COMPLETO"].split(" ");
            const firstName = nameParts.slice(0, Math.max(1, Math.ceil(nameParts.length / 2))).join(" ") || "Desconocido";
            const lastName = nameParts.slice(Math.max(1, Math.ceil(nameParts.length / 2))).join(" ") || "";

            validRowsToInsert.push({
                folio,
                amount: data["TOTAL"],
                person_name: data["NOMBRE COMPLETO"],
                first_name: firstName,
                last_name: lastName,
                custom_concept: data["CONCEPTO"],
                status,
                payment_method: data["PAGO EN"],
                location: data["SEDE"],
                created_by: user.id,
                org_id: member.org_id,
                created_at: createdAt.toISOString(),
                currency: "MXN",
                quantity: 1,
                discount: 0,
            });
        } catch (error: unknown) {
            errorCount++;
            errors.push({
                row: index + 2,
                error: error instanceof Error ? error.message : "Unknown import error",
            });
        }
    }

    const incomingFolios = validRowsToInsert.map((row) => row.folio);
    const existingFolios = new Set<string>();
    for (let i = 0; i < incomingFolios.length; i += 100) {
        const { data } = await supabase
            .from("payments")
            .select("folio")
            .in("folio", incomingFolios.slice(i, i + 100))
            .eq("org_id", member.org_id);

        if (data) {
            (data as ExistingPaymentFolioRow[]).forEach((payment) => existingFolios.add(payment.folio));
        }
    }

    const finalRows = validRowsToInsert.filter((row) => {
        if (existingFolios.has(row.folio)) {
            errorCount++;
            errors.push({ row: "N/A", error: `Folio ${row.folio} already exists` });
            return false;
        }
        return true;
    });

    if (finalRows.length > 0) {
        const { error } = await supabase.from("payments").insert(finalRows);
        if (error) throw error;
        successCount += finalRows.length;
    }

    return NextResponse.json({
        success: true,
        message: `Imported ${successCount} records. Ignored/Failed: ${errorCount}.`,
        successCount,
        errorCount,
        errors: errors.slice(0, 50),
    });
}, { module: "finanzas", action: "edit" });
