import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

type ImportRow = Record<string, unknown>;

function buildCandidateDetails(row: ImportRow) {
    const candidateDetails = { ...row };

    delete candidateDetails["#"];
    delete candidateDetails["# Folio Local"];
    delete candidateDetails["UNIQ-ID"];
    delete candidateDetails["VOUCHER CODE"];
    delete candidateDetails["PIN"];
    delete candidateDetails["Estatus"];
    delete candidateDetails["Asignado A / Historico"];
    delete candidateDetails["Asignado A / Historico"];
    delete candidateDetails["Asignado A / HistÃ³rico"];
    delete candidateDetails["Vencimiento"];
    delete candidateDetails["EXAMEN"];

    return candidateDetails;
}

export const POST = withAuth(async (req, { supabase, user }) => {
    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
        return NextResponse.json(
            { error: "Invalid data format. Expected a non-empty array of rows." },
            { status: 400 }
        );
    }

    let successCount = 0;
    let insertedCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: ImportRow; reason: string }> = [];

    for (let index = 0; index < body.length; index++) {
        const row = body[index] as ImportRow;
        const rawUniqId = row["UNIQ-ID"]?.toString().trim();
        const rawVoucher =
            row["VOUCHER CODE"]?.toString().trim() ||
            row["PIN"]?.toString().trim() ||
            null;
        const voucherCode = rawVoucher === "PENDIENTE" ? null : rawVoucher;
        const rawExam = row["EXAMEN"];
        const candidateDetails = buildCandidateDetails(row);

        const hasCandidate = Boolean(
            candidateDetails["FAMILY NAME"] || candidateDetails["GIVEN NAME"]
        );
        const status = voucherCode || hasCandidate ? "ASSIGNED" : "AVAILABLE";

        const updateData: {
            candidate_details: ImportRow;
            updated_at: string;
            voucher_code?: string | null;
            status: string;
        } = {
            candidate_details: candidateDetails,
            updated_at: new Date().toISOString(),
            status,
        };

        if (voucherCode) {
            updateData.voucher_code = voucherCode;
        }

        let existingCode: { id: string; system_uniq_id: string } | null = null;

        if (rawUniqId) {
            const { data: searchData } = await supabase
                .from("toefl_codes")
                .select("id, system_uniq_id")
                .eq("system_uniq_id", rawUniqId)
                .maybeSingle();

            existingCode = searchData;
        }

        if (existingCode) {
            const { error } = await supabase
                .from("toefl_codes")
                .update(updateData)
                .eq("id", existingCode.id);

            if (error) {
                errorCount++;
                errors.push({ row, reason: error.message });
            } else {
                successCount++;
            }

            continue;
        }

        const now = new Date();
        const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
        const timestamp = now.getTime().toString().slice(-6);
        const sequence = (index + 1).toString().padStart(3, "0");

        const newFolio = `TFL-${datePrefix}-${timestamp}-${sequence}`;
        const newUniqId = `LEC-${datePrefix}${timestamp}${sequence}`;
        const testType = rawExam || "ETS | LECETS | LINEA";

        const { error } = await supabase
            .from("toefl_codes")
            .insert({
                folio: newFolio,
                system_uniq_id: newUniqId,
                test_type: testType,
                voucher_code: voucherCode || null,
                candidate_details: candidateDetails,
                status,
                created_by: user.id,
            });

        if (error) {
            errorCount++;
            errors.push({ row, reason: error.message });
        } else {
            insertedCount++;
        }
    }

    return NextResponse.json(
        {
            message: `Import processed. ${successCount} updated, ${insertedCount} newly inserted. ${errorCount} failed.`,
            successCount: successCount + insertedCount,
            errorCount,
            errors,
        },
        { status: 200 }
    );
}, { module: "toefl-codes", action: "edit" });
