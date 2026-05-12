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

interface SendApplicatorPortalInviteParams {
    to: string;
    orgName: string;
    applicatorName: string;
    joinUrl: string;
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

export async function sendApplicatorPortalInviteEmail({
    to,
    orgName,
    applicatorName,
    joinUrl,
}: SendApplicatorPortalInviteParams): Promise<SendInvitationEmailResult> {
    if (!resend) {
        console.warn(
            "[email] RESEND_API_KEY is not configured; applicator portal invite email was not sent."
        );
        return { sent: false, error: "RESEND_API_KEY not configured" };
    }

    try {
        const from =
            process.env.RESEND_FROM_EMAIL ||
            "LEC Platform <onboarding@updates.luisaguilaraguila.com>";
        const subject = `Acceso al portal de aplicadores — ${orgName}`;
        const html = `
          <p>Hola${applicatorName ? ` <strong>${applicatorName}</strong>` : ""},</p>
          <p>Te invitaron a acceder al <strong>portal de aplicadores</strong> de <strong>${orgName}</strong> en LEC Platform.</p>
          <p style="margin: 20px 0;">
            <a
              href="${joinUrl}"
              style="display:inline-block;background:#002e5d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:8px;"
            >
              Aceptar invitación y continuar
            </a>
          </p>
          <p>Si el botón no funciona, copia y pega esta URL en tu navegador:<br/><code>${joinUrl}</code></p>
          <p>Este enlace expira en unos días. Debes iniciar sesión con el mismo correo al que llegó este mensaje.</p>
        `;
        const text = `Portal de aplicadores (${orgName})\n\nAbre: ${joinUrl}\n\nInicia sesión con el correo que recibió esta invitación.`;

        const { error } = await resend.emails.send({
            from,
            to,
            subject,
            html,
            text,
        });

        if (error) {
            console.error("[email] Resend error (applicator portal):", error);
            return { sent: false, error: error.message };
        }

        return { sent: true };
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Unknown email error";
        console.error("[email] sendApplicatorPortalInviteEmail failed:", message);
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
