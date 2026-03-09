import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkServerPermission } from "@/lib/auth/permissions";

// This endpoint expects a JSON array of parsed Excel rows
export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!Array.isArray(body) || body.length === 0) {
            return NextResponse.json({ error: "Invalid data format. Expected a non-empty array of rows." }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canEdit = await checkServerPermission(supabase, user.id, "examenes", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions to import" }, { status: 403 });
        }

        // The user mentioned the unique identifier linking ETS to us is `UNIQ-ID` mapped to `system_uniq_id`
        // Or if they mean they generated it earlier in the empty slot, we match on it.
        // We will loop through and update records where system_uniq_id matches the Excel's UNIQ-ID

        let successCount = 0;
        let insertedCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let index = 0; index < body.length; index++) {
            const row = body[index];
            const rawUniqId = row["UNIQ-ID"]?.toString().trim();
            const rawVoucher = row["VOUCHER CODE"]?.toString().trim() || row["PIN"]?.toString().trim() || null;
            const voucherCode = rawVoucher === "PENDIENTE" ? null : rawVoucher;

            // Extract candidate details
            const { "#": _hash, "# Folio Local": _folioL, "UNIQ-ID": _uid, "VOUCHER CODE": _vc, "PIN": _pin, "Estatus": _s, "Asignado A / Histórico": _a, "Vencimiento": _v, "EXAMEN": rawExam, ...candidateDetails } = row;

            const hasCandidate = !!(candidateDetails["FAMILY NAME"] || candidateDetails["GIVEN NAME"]);
            let status = "AVAILABLE";
            if (voucherCode || hasCandidate) {
                status = "ASSIGNED";
            }

            const updateData: any = {
                candidate_details: candidateDetails,
                updated_at: new Date().toISOString()
            };

            if (voucherCode) updateData.voucher_code = voucherCode;
            updateData.status = status;

            let existingCode = null;
            if (rawUniqId) {
                const { data: searchData } = await supabase
                    .from("toefl_codes")
                    .select("id, system_uniq_id")
                    .eq("system_uniq_id", rawUniqId)
                    .single();
                existingCode = searchData;
            }

            if (existingCode) {
                // Update
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
            } else {
                // Insert new (Legacy Import)
                const now = new Date();
                const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
                const timestamp = now.getTime().toString().slice(-6);
                const sequence = (index + 1).toString().padStart(3, '0');

                const newFolio = `TFL-${datePrefix}-${timestamp}-${sequence}`;
                const newUniqId = `LEC-${datePrefix}${timestamp}${sequence}`;

                const testType = rawExam || "ETS | LECETS | LÍNEA"; // default or mapped

                const { error } = await supabase
                    .from("toefl_codes")
                    .insert({
                        folio: newFolio,
                        system_uniq_id: newUniqId,
                        test_type: testType,
                        voucher_code: voucherCode || null,
                        candidate_details: candidateDetails,
                        status: status,
                        created_by: user.id
                    });

                if (error) {
                    errorCount++;
                    errors.push({ row, reason: error.message });
                } else {
                    insertedCount++;
                }
            }
        }

        return NextResponse.json({
            message: `Import processed. ${successCount} updated, ${insertedCount} newly inserted. ${errorCount} failed.`,
            successCount: successCount + insertedCount,
            errorCount,
            errors
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
