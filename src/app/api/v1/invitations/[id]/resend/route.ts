import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { sendInvitationEmail } from "@/lib/email/resend";

export const POST = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    if (member.role !== 'admin') {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // 1. Fetch the invitation
    const { data: invitation, error: fetchError } = await supabase
        .from('org_invitations')
        .select('*, organizations(name)')
        .eq('id', id)
        .eq('org_id', member.org_id)
        .single();

    if (fetchError || !invitation) {
        return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
        return NextResponse.json(
            { error: `No se puede reenviar: la invitación está en estado "${invitation.status}"` },
            { status: 400 }
        );
    }

    // 2. Build join URL and resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const joinUrl = `${appUrl}/join/${invitation.token}`;

    const orgName = (invitation.organizations as { name: string } | null)?.name ?? "tu organización";

    const result = await sendInvitationEmail({
        to: invitation.email,
        orgName,
        role: invitation.role,
        joinUrl,
    });

    return NextResponse.json({
        resent: result.sent,
        joinUrl,
        ...(result.error ? { error: result.error } : {}),
    });
}, { module: "users", action: "edit" });
