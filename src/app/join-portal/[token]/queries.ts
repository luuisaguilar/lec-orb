import { createAdminClient } from "@/lib/supabase/admin";

export interface ApplicatorPortalInvitePreview {
    organizationName: string;
    applicatorName: string;
    invitedEmailMasked: string;
    expiresAt: string | null;
}

export type ApplicatorPortalInviteResult =
    | { ok: true; preview: ApplicatorPortalInvitePreview }
    | { ok: false; reason: "not_found" | "already_processed" | "expired" | "server_error" };

function maskEmail(email: string): string {
    const emailParts = email.split("@");
    let maskedUser = "*";
    if (emailParts[0] && emailParts[0].length > 2) {
        maskedUser = `${emailParts[0].charAt(0)}***${emailParts[0].charAt(emailParts[0].length - 1)}`;
    } else if (emailParts[0]) {
        maskedUser = emailParts[0].charAt(0) + "***";
    }
    return `${maskedUser}@${emailParts[1] || "domain.com"}`;
}

export async function getApplicatorPortalInviteResult(
    token: string
): Promise<ApplicatorPortalInviteResult> {
    let adminClient;
    try {
        adminClient = createAdminClient();
    } catch (e) {
        console.error("[join-portal] Admin client unavailable:", e);
        return { ok: false, reason: "server_error" };
    }

    const { data: invitation, error } = await adminClient
        .from("applicator_portal_invitations")
        .select(
            `
      id,
      status,
      email,
      expires_at,
      organizations ( name ),
      applicators ( name )
    `
        )
        .eq("token", token)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return { ok: false, reason: "not_found" };
        }
        console.error("[join-portal] DB error:", error.message);
        return { ok: false, reason: "server_error" };
    }

    if (!invitation) {
        return { ok: false, reason: "not_found" };
    }

    if (invitation.status !== "pending") {
        return { ok: false, reason: "already_processed" };
    }

    const expiresAt = invitation.expires_at as string | null;
    if (expiresAt && new Date(expiresAt) < new Date()) {
        return { ok: false, reason: "expired" };
    }

    const orgName =
        (invitation.organizations as { name?: string } | null)?.name ?? "tu organización";
    const applicatorName =
        (invitation.applicators as { name?: string } | null)?.name ?? "Aplicador";

    return {
        ok: true,
        preview: {
            organizationName: orgName,
            applicatorName,
            invitedEmailMasked: maskEmail(invitation.email as string),
            expiresAt,
        },
    };
}
