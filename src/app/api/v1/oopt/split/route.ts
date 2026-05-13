import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { processOoptPdfSplit } from "@/lib/oopt-pdf-splitter";

export const maxDuration = 120;

/**
 * POST multipart/form-data
 * - pdf: consolidated OOPT results PDF (required)
 * - xls: TableData.xls from Oxford (optional, UTF-8 text / HTML table)
 */
export const POST = withAuth(
    async (req) => {
        const ct = req.headers.get("content-type") || "";
        if (!ct.includes("multipart/form-data")) {
            return NextResponse.json(
                { error: "Se esperaba multipart/form-data con el campo pdf." },
                { status: 400 }
            );
        }

        const form = await req.formData();
        const pdfEntry = form.get("pdf");
        const xlsEntry = form.get("xls");

        if (!pdfEntry || typeof pdfEntry === "string") {
            return NextResponse.json({ error: "No se subió ningún archivo PDF." }, { status: 400 });
        }

        const pdfFile = pdfEntry as File;
        const pdfBuf = new Uint8Array(await pdfFile.arrayBuffer());

        let xlsUtf8: string | null = null;
        if (xlsEntry && typeof xlsEntry !== "string") {
            const xlsFile = xlsEntry as File;
            const raw = new Uint8Array(await xlsFile.arrayBuffer());
            try {
                xlsUtf8 = new TextDecoder("utf-8", { fatal: false }).decode(raw);
            } catch {
                xlsUtf8 = Buffer.from(raw).toString("utf-8");
            }
        }

        try {
            const body = await processOoptPdfSplit(pdfBuf, xlsUtf8, { pdfFileName: pdfFile.name });
            return NextResponse.json(body);
        } catch (e: any) {
            console.error("[oopt/split]", e);
            const msg = e?.message ?? "Error al procesar el PDF.";
            const isUserInput =
                msg.includes("no es un PDF") ||
                msg.includes("TableData") ||
                msg.includes("vacío") ||
                msg.includes("falta la cabecera");
            return NextResponse.json({ error: msg }, { status: isUserInput ? 400 : 500 });
        }
    },
    { module: "oopt-pdf", action: "view" }
);
