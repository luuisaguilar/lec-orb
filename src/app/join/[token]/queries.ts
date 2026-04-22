import { createAdminClient } from "@/lib/supabase/admin";

export interface InvitationPreview {
    organizationName: string;
    role: string;
    invitedEmailMasked: string;
    expiresAt: string | null;
}

/**
 * Retrieves a minimal, safe payload about an invitation using a privileged client.
 * Does not expose internal UUIDs or full emails to the client.
 */
export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
    const adminClient = createAdminClient();

    const { data: invitation, error } = await adminClient
        .from("org_invitations")
        .select("*, organizations(name)")
        .eq("token", token)
        .single();

    if (error || !invitation) {
        return null;
    }

    if (invitation.status !== "pending") {
        return null;
    }

    // Mask email for privacy (e.g., l***s@gmail.com)
    const emailParts = invitation.email.split("@");
    let maskedUser = "*";
    if (emailParts[0] && emailParts[0].length > 2) {
        maskedUser = `${emailParts[0].charAt(0)}***${emailParts[0].charAt(emailParts[0].length - 1)}`;
    } else if (emailParts[0]) {
        maskedUser = emailParts[0].charAt(0) + "***";
    }
    const invitedEmailMasked = `${maskedUser}@${emailParts[1] || "domain.com"}`;

    return {
        organizationName: (invitation.organizations as any)?.name || "la organización",
        role: invitation.role,
        invitedEmailMasked,
        expiresAt: null, // The DB schema doesn't define expires_at, so we return null.
    };
}
