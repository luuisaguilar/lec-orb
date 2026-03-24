import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { sendInvitationEmail } from "@/lib/email/resend";

const inviteSchema = z.object({
    email: z.string().email("Email inválido"),
    role: z.enum(["admin", "supervisor", "operador", "applicator"], {
        message: "Rol inválido",
    }),
    sendEmail: z.boolean().default(true),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: invitations, error } = await supabase
        .from('org_invitations')
        .select('*')
        .eq('org_id', member.org_id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ invitations });
}, { module: "users", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // Role check: only admins can invite
    if (member.role !== 'admin') {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // 1. Insert invitation
    const { data: invitation, error } = await supabase
        .from('org_invitations')
        .insert({
            org_id: member.org_id,
            email: parsed.data.email,
            role: parsed.data.role,
            invited_by: user.id
        })
        .select()
        .single();

    if (error) throw error;

    // 2. Build join URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const joinUrl = `${appUrl}/join/${invitation.token}`;

    // 3. Fetch org name for the email
    let emailSent = false;
    if (parsed.data.sendEmail) {
        const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', member.org_id)
            .single();

        const result = await sendInvitationEmail({
            to: parsed.data.email,
            orgName: org?.name ?? "tu organización",
            role: parsed.data.role,
            joinUrl,
        });
        emailSent = result.sent;
    }

    return NextResponse.json({ invitation, emailSent, joinUrl });
}, { module: "users", action: "edit" });
