import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { sendInvitationEmail } from "@/lib/email/resend";
import { resolveAppOrigin } from "@/lib/env/app-url";

export const POST = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    if (member.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { data: invitation, error: invitationError } = await supabase
        .from("org_invitations")
        .select("id, email, role, status, token")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (invitationError || !invitation) {
        return NextResponse.json({ error: "Invitacion no encontrada" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
        return NextResponse.json(
            { error: `No se puede reenviar una invitacion con estado "${invitation.status}"` },
            { status: 400 }
        );
    }

    const joinUrl = `${resolveAppOrigin(req)}/join/${invitation.token}`;

    let orgName = "tu organizacion";

    const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", member.org_id)
        .single();

    if (organizationError) {
        console.warn(
            "[invitations] Could not load organization name for resend email:",
            organizationError.message
        );
    } else if (organization?.name) {
        orgName = organization.name;
    }

    const result = await sendInvitationEmail({
        to: invitation.email,
        orgName,
        role: invitation.role,
        joinUrl,
    });

    return NextResponse.json({
        joinUrl,
        emailSent: result.sent,
        emailError: result.sent ? undefined : result.error,
    });
}, { module: "users", action: "edit" });
