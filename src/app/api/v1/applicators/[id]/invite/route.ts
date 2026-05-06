import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { resolveAppOrigin } from "@/lib/env/app-url";
import { sendApplicatorPortalInviteEmail } from "@/lib/email/resend";
import { logAudit } from "@/lib/audit/log";

const bodySchema = z.object({
    sendEmail: z.boolean().optional().default(true),
    expiresInDays: z.number().int().min(1).max(60).optional(),
});

export const POST = withAuth(
    async (req, { supabase, user, member }, { params }) => {
        const { id: applicatorId } = await params;

        if (member.role !== "admin" && member.role !== "supervisor") {
            return NextResponse.json(
                { error: "Solo administradores y supervisores pueden invitar al portal." },
                { status: 403 }
            );
        }

        const parsedBody = bodySchema.safeParse(await req.json().catch(() => ({})));
        if (!parsedBody.success) {
            return NextResponse.json(
                { error: "Datos inválidos", details: parsedBody.error.flatten() },
                { status: 400 }
            );
        }

        const { data: applicator, error: appErr } = await supabase
            .from("applicators")
            .select("id, org_id, name, email, auth_user_id")
            .eq("id", applicatorId)
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .single();

        if (appErr || !applicator) {
            return NextResponse.json({ error: "Aplicador no encontrado" }, { status: 404 });
        }

        if (applicator.auth_user_id) {
            return NextResponse.json(
                { error: "Este aplicador ya tiene cuenta vinculada al portal." },
                { status: 409 }
            );
        }

        const email = applicator.email?.trim();
        if (!email) {
            return NextResponse.json(
                { error: "El aplicador debe tener un correo electrónico para enviar la invitación." },
                { status: 400 }
            );
        }

        await supabase
            .from("applicator_portal_invitations")
            .update({ status: "cancelled" })
            .eq("applicator_id", applicatorId)
            .eq("status", "pending");

        const expiresAt = parsedBody.data.expiresInDays
            ? new Date(
                  Date.now() + parsedBody.data.expiresInDays * 24 * 60 * 60 * 1000
              ).toISOString()
            : undefined;

        const { data: invitation, error: invErr } = await supabase
            .from("applicator_portal_invitations")
            .insert({
                org_id: member.org_id,
                applicator_id: applicatorId,
                email,
                invited_by: user.id,
                ...(expiresAt ? { expires_at: expiresAt } : {}),
            })
            .select("id, token")
            .single();

        if (invErr || !invitation) {
            return NextResponse.json(
                { error: invErr?.message ?? "No se pudo crear la invitación" },
                { status: 500 }
            );
        }

        const joinUrl = `${resolveAppOrigin(req)}/join-portal/${invitation.token}`;

        let emailSent = false;
        if (parsedBody.data.sendEmail) {
            let orgName = "LEC";
            const { data: org } = await supabase
                .from("organizations")
                .select("name")
                .eq("id", member.org_id)
                .single();
            if (org?.name) orgName = org.name;

            const result = await sendApplicatorPortalInviteEmail({
                to: email,
                orgName,
                applicatorName: applicator.name,
                joinUrl,
            });
            emailSent = result.sent;
        }

        await logAudit(supabase, {
            org_id: member.org_id,
            table_name: "applicator_portal_invitations",
            record_id: invitation.id,
            action: "INSERT",
            new_data: { applicator_id: applicatorId, email, joinUrl },
            performed_by: user.id,
        });

        return NextResponse.json({
            invitationId: invitation.id,
            joinUrl,
            emailSent,
        });
    },
    { module: "applicators", action: "edit" }
);
