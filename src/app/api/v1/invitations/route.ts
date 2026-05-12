import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { sendInvitationEmail } from "@/lib/email/resend";
import { resolveAppOrigin } from "@/lib/env/app-url";
import { resolveInviteJobFields } from "@/lib/invitations/resolve-invite-job";
import { isAssignableOrgLocation } from "@/lib/org/validate-location";

const uuidFromClient = z.preprocess((v) => {
    if (v === "" || v === "__custom__" || v === null || v === undefined) return undefined;
    return v;
}, z.string().uuid().optional());

const inviteSchema = z
    .object({
        email: z.string().email("Email invalido"),
        role: z.enum(["admin", "supervisor", "operador", "applicator"], {
            message: "Rol invalido",
        }),
        sendEmail: z.boolean().optional().default(true),
        job_title: z.string().max(200).optional(),
        hr_profile_id: uuidFromClient,
        location: z.string().min(1, "Sede requerida").max(200),
        // Optional override. DB default is 7 days; valid range 1–60.
        expiresInDays: z.number().int().min(1).max(60).optional(),
    })
    .superRefine((data, ctx) => {
        const hasProfile = Boolean(data.hr_profile_id);
        const hasManual = Boolean(data.job_title?.trim());
        if (!hasProfile && !hasManual) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Debes elegir un puesto del organigrama (perfil HR) o escribir un rol empresa.",
                path: ["job_title"],
            });
        }
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

    const locationOk = await isAssignableOrgLocation(supabase, member.org_id, parsed.data.location.trim());
    if (!locationOk) {
        return NextResponse.json(
            { error: "Sede invalida o inactiva. Debe existir en el catalogo de sedes de tu organizacion." },
            { status: 400 }
        );
    }

    const resolved = await resolveInviteJobFields(supabase, member.org_id, {
        hr_profile_id: parsed.data.hr_profile_id ?? null,
        job_title: parsed.data.job_title,
    });
    if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { job_title: inviteJobTitle, hr_profile_id: inviteHrProfileId } = resolved;

    const expiresAt = parsed.data.expiresInDays
        ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    const { data: invitation, error } = await supabase
        .from("org_invitations")
        .insert({
            org_id: member.org_id,
            email: parsed.data.email,
            role: parsed.data.role,
            job_title: inviteJobTitle,
            hr_profile_id: inviteHrProfileId,
            location: parsed.data.location.trim(),
            invited_by: user.id,
            ...(expiresAt ? { expires_at: expiresAt } : {}),
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "Ya existe una invitación pendiente para este correo en tu organización." },
                { status: 409 }
            );
        }
        throw error;
    }

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
