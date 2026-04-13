import { Resend } from "resend";
import { getInvitationEmailHtml, getInvitationEmailText } from "./templates";

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
        const { error } = await resend.emails.send({
            from: "LEC Platform <onboarding@resend.dev>",
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
