import { Resend } from "resend";
import { getInvitationEmailHtml } from "./templates";

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

interface SendInvitationEmailParams {
    to: string;
    orgName: string;
    role: string;
    joinUrl: string;
}

export async function sendInvitationEmail({
    to,
    orgName,
    role,
    joinUrl,
}: SendInvitationEmailParams): Promise<{ sent: boolean; error?: string }> {
    if (!resend) {
        console.warn(
            "[email] RESEND_API_KEY is not configured — invitation email was not sent."
        );
        return { sent: false, error: "RESEND_API_KEY not configured" };
    }

    try {
        const { error } = await resend.emails.send({
            from: "LEC Platform <onboarding@resend.dev>",
            to,
            subject: `Invitación a ${orgName} — LEC Platform`,
            html: getInvitationEmailHtml({ orgName, role, joinUrl }),
        });

        if (error) {
            console.error("[email] Resend error:", error);
            return { sent: false, error: error.message };
        }

        return { sent: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[email] sendInvitationEmail failed:", message);
        return { sent: false, error: message };
    }
}
