import { createAdminClient } from "@/lib/supabase/admin";

export interface InvitationPreview {
    organizationName: string;
    role: string;
    jobTitle: string | null;
    location: string | null;
    invitedEmail: string;
    invitedEmailMasked: string;
    expiresAt: string | null;
}

export type InvitationResult =
    | { ok: true; preview: InvitationPreview }
    | { ok: false; reason: "not_found" | "already_processed" | "server_error" };

/**
 * Retrieves a minimal, safe payload about an invitation using a privileged client.
 * Does not expose internal UUIDs or full emails to the client.
 * Returns a discriminated result so the page can show the right message.
 */
export async function getInvitationResult(token: string): Promise<InvitationResult> {
    let adminClient;
    try {
        adminClient = createAdminClient();
    } catch (e) {
        console.error("[join] Admin client unavailable — SUPABASE_SERVICE_ROLE_KEY missing?", e);
        return { ok: false, reason: "server_error" };
    }

    const { data: invitation, error } = await adminClient
        .from("org_invitations")
        .select("role, email, status, job_title, location, organizations(name)")
        .eq("token", token)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // No rows found — token doesn't exist
            console.warn("[join] Invitation not found for token:", token.slice(0, 8) + "...");
            return { ok: false, reason: "not_found" };
        }
        // Any other error (auth failure, wrong key, network) → server error
        console.error("[join] DB query failed — possible wrong service role key?", {
            code: error.code,
            message: error.message,
            hint: error.hint,
        });
        return { ok: false, reason: "server_error" };
    }

    if (!invitation) {
        console.warn("[join] No invitation row returned for token:", token.slice(0, 8) + "...");
        return { ok: false, reason: "not_found" };
    }

    if (invitation.status !== "pending") {
        console.warn("[join] Invitation status is not pending:", invitation.status, "for token:", token.slice(0, 8) + "...");
        return { ok: false, reason: "already_processed" };
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
        ok: true,
        preview: {
            organizationName: (invitation.organizations as any)?.name || "la organización",
            role: invitation.role,
            jobTitle: invitation.job_title ?? null,
            location: invitation.location ?? null,
            invitedEmail: invitation.email,
            invitedEmailMasked,
            expiresAt: null,
        },
    };
}

// Keep old function for backwards compatibility
export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
    const result = await getInvitationResult(token);
    return result.ok ? result.preview : null;
}
