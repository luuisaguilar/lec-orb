import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { sendInvitationEmail } from "@/lib/email/resend";
import { resolveAppOrigin } from "@/lib/env/app-url";

const inviteSchema = z.object({
    email: z.string().email("Email invalido"),
    role: z.enum(["admin", "supervisor", "operador", "applicator"], {
        message: "Rol invalido",
    }),
    sendEmail: z.boolean().optional().default(true),
    // Optional override. DB default is 7 days; valid range 1–60.
    expiresInDays: z.number().int().min(1).max(60).optional(),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: invitations, error } = await supabase
        .from("org_invitations")
        .select("*")
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ invitations });
}, { module: "users", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos invalidos", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    if (member.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const expiresAt = parsed.data.expiresInDays
        ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    const { data: invitation, error } = await supabase
        .from("org_invitations")
        .insert({
            org_id: member.org_id,
            email: parsed.data.email,
            role: parsed.data.role,
            invited_by: user.id,
            ...(expiresAt ? { expires_at: expiresAt } : {}),
        })
        .select()
        .single();

    if (error) throw error;

    const joinUrl = `${resolveAppOrigin(req)}/join/${invitation.token}`;

    let emailSent = false;

    if (parsed.data.sendEmail) {
        let orgName = "tu organizacion";

        const { data: organization, error: organizationError } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", member.org_id)
            .single();

        if (organizationError) {
            console.warn(
                "[invitations] Could not load organization name for invite email:",
                organizationError.message
            );
        } else if (organization?.name) {
            orgName = organization.name;
        }

        const result = await sendInvitationEmail({
            to: parsed.data.email,
            orgName,
            role: parsed.data.role,
            joinUrl,
        });

        emailSent = result.sent;

        return NextResponse.json({
            invitation,
            joinUrl,
            emailSent,
            emailError: emailSent ? undefined : (result.error ?? "Email not sent"),
        });
    }

    return NextResponse.json({ invitation, joinUrl, emailSent });
}, { module: "users", action: "edit" });
