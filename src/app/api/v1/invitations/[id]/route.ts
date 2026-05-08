import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { resolveInviteJobFields } from "@/lib/invitations/resolve-invite-job";
import { isAssignableOrgLocation } from "@/lib/org/validate-location";

const uuidFromClient = z.preprocess((v) => {
    if (v === "" || v === "__custom__" || v === null || v === undefined) return undefined;
    return v;
}, z.string().uuid().optional());

const patchInvitationSchema = z.object({
    status: z.enum(["pending", "accepted", "expired", "revoked"]).optional(),
    job_title: z.string().max(200).optional(),
    hr_profile_id: uuidFromClient,
    location: z.string().min(1).max(200).optional(),
});

export const PATCH = withAuth(async (req, { supabase, member: membership }, { params }) => {
    const { id } = await params;

    if (membership?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = patchInvitationSchema.safeParse(rawBody);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos invalidos", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const data = parsed.data;
    const wantsStatus = data.status !== undefined;
    const wantsJob = data.hr_profile_id !== undefined || data.job_title !== undefined;
    const wantsLocation = data.location !== undefined;

    if (!wantsStatus && !wantsJob && !wantsLocation) {
        return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    const { data: invitation, error: fetchError } = await supabase
        .from("org_invitations")
        .select("*")
        .eq("id", id)
        .eq("org_id", membership.org_id)
        .maybeSingle();

    if (fetchError) throw fetchError;
    if (!invitation) {
        return NextResponse.json({ error: "Invitacion no encontrada" }, { status: 404 });
    }

    if ((wantsJob || wantsLocation) && invitation.status !== "pending") {
        return NextResponse.json(
            { error: "Solo se pueden editar sede o puesto en invitaciones pendientes." },
            { status: 400 }
        );
    }

    const updates: {
        status?: (typeof invitation)["status"];
        location?: string;
        job_title?: string | null;
        hr_profile_id?: string | null;
    } = {};

    if (wantsStatus) {
        updates.status = data.status;
    }

    if (wantsLocation) {
        const locationOk = await isAssignableOrgLocation(
            supabase,
            membership.org_id,
            data.location!.trim()
        );
        if (!locationOk) {
            return NextResponse.json(
                {
                    error: "Sede invalida o inactiva. Debe existir en el catalogo de sedes de tu organizacion.",
                },
                { status: 400 }
            );
        }
        updates.location = data.location!.trim();
    }

    if (wantsJob) {
        const resolved = await resolveInviteJobFields(supabase, membership.org_id, {
            hr_profile_id: data.hr_profile_id ?? null,
            job_title: data.job_title,
        });
        if (!resolved.ok) {
            return NextResponse.json({ error: resolved.error }, { status: resolved.status });
        }
        updates.job_title = resolved.job_title;
        updates.hr_profile_id = resolved.hr_profile_id;
    }

    const { data: updatedInvitation, error } = await supabase
        .from("org_invitations")
        .update(updates)
        .eq("id", id)
        .eq("org_id", membership.org_id)
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ invitation: updatedInvitation });
}, { module: "users", action: "edit" });

// Permanently delete a single invitation (admin only, non-pending only)
export const DELETE = withAuth(async (req, { supabase, member: membership }, { params }) => {
    const { id } = await params;

    if (membership?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase
        .from("org_invitations")
        .delete()
        .eq("id", id)
        .eq("org_id", membership.org_id)
        .neq("status", "pending");

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "users", action: "edit" });
