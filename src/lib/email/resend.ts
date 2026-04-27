import { Resend } from "resend";
import {
    getInvitationEmailHtml,
    getInvitationEmailText,
    getCertificateEmailHtml,
    getCertificateEmailText,
} from "./templates";

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

interface SendInvitationEmailParams {
    to: string;
    orgName: string;
    role: "admin" | "supervisor" | "operador" | "applicator";
    joinUrl: string;
}

interface SendInvitationEmailResult {
    sent: boolean;
    error?: string;
}

interface SendCertificateEmailParams {
    to: string;
    studentName: string;
    folio: string;
    orgName: string;
    downloadUrl: string;
}

export async function sendCertificateEmail({
    to,
    studentName,
    folio,
    orgName,
    downloadUrl,
}: SendCertificateEmailParams): Promise<{ sent: boolean; error?: string }> {
    if (!resend) {
        console.warn("[email] RESEND_API_KEY not configured; certificate email not sent.");
        return { sent: false, error: "RESEND_API_KEY not configured" };
    }

    try {
        const from = process.env.RESEND_FROM_EMAIL || "LEC Platform <onboarding@updates.luisaguilaraguila.com>";
        const { error } = await resend.emails.send({
            from,
            to,
            subject: `Tu certificado CENNI ${folio} esta listo`,
            html: getCertificateEmailHtml({ studentName, folio, orgName, downloadUrl }),
            text: getCertificateEmailText({ studentName, folio, orgName, downloadUrl }),
        });

        if (error) {
            console.error("[email] Resend error:", error);
            return { sent: false, error: error.message };
        }

        return { sent: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown email error";
        console.error("[email] sendCertificateEmail failed:", message);
        return { sent: false, error: message };
    }
}

export async function sendInvitationEmail({
    to,
    orgName,
    role,
    joinUrl,
}: SendInvitationEmailParams): Promise<SendInvitationEmailResult> {
    if (!resend) {
        console.warn(
            "[email] RESEND_API_KEY is not configured; invitation email was not sent."
        );
        return { sent: false, error: "RESEND_API_KEY not configured" };
    }

    try {
        const from = process.env.RESEND_FROM_EMAIL || "LEC Platform <onboarding@updates.luisaguilaraguila.com>";
        const { error } = await resend.emails.send({
            from,
            to,
            subject: `Invitacion a ${orgName} - LEC Platform`,
            html: getInvitationEmailHtml({ orgName, role, joinUrl }),
            text: getInvitationEmailText({ orgName, role, joinUrl }),
        });

        if (error) {
            console.error("[email] Resend error:", error);
            return { sent: false, error: error.message };
        }

        return { sent: true };
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Unknown email error";
        console.error("[email] sendInvitationEmail failed:", message);
        return { sent: false, error: message };
    }
}
