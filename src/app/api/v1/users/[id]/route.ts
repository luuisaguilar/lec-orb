import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { isAssignableOrgLocation } from "@/lib/org/validate-location";

export const GET = withAuth(async (req, { supabase, member }, { params }) => {
    const { id } = await params;

    const { data: memberRow, error: memberError } = await supabase
        .from('org_members')
        .select('*')
        .eq('id', id)
        .eq('org_id', member.org_id)
        .single();

    if (memberError || !memberRow) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', memberRow.user_id)
        .single();

    const { data: access } = await supabase
        .from('member_module_access')
        .select('*')
        .eq('member_id', id);

    return NextResponse.json({
        member: {
            ...memberRow,
            full_name: profile?.full_name || 'Desconocido'
        },
        access: access || []
    });
}, { module: "users", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member: caller }, { params }) => {
    const { id } = await params;
    const body = await req.json();

    if (caller?.role !== 'admin') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates: Record<string, unknown> = {};
    if (body.role) updates.role = body.role;

    if (body.hr_profile_id !== undefined) {
        const raw = body.hr_profile_id;
        if (raw === null || raw === "") {
            updates.hr_profile_id = null;
            if (body.job_title !== undefined) {
                if (body.job_title === null || String(body.job_title).trim() === "") {
                    updates.job_title = null;
                } else {
                    updates.job_title = String(body.job_title).trim();
                }
            }
        } else {
            const pid = String(raw);
            const { data: hp, error: hpErr } = await supabase
                .from("hr_profiles")
                .select("role_title")
                .eq("id", pid)
                .eq("org_id", caller.org_id)
                .maybeSingle();

            if (hpErr) throw hpErr;
            if (!hp) {
                return NextResponse.json(
                    { error: "Perfil de puesto (RRHH) invalido o no pertenece a tu organizacion." },
                    { status: 400 }
                );
            }
            updates.hr_profile_id = pid;
            updates.job_title = hp.role_title;
        }
    } else if (body.job_title !== undefined) {
        updates.hr_profile_id = null;
        if (body.job_title === null || String(body.job_title).trim() === "") {
            updates.job_title = null;
        } else {
            updates.job_title = String(body.job_title).trim();
        }
    }

    let normalizedLocation: string | null | undefined = undefined;
    if (body.location !== undefined) {
        if (body.location === null || String(body.location).trim() === "") {
            normalizedLocation = null;
        } else {
            normalizedLocation = String(body.location).trim();
            const locOk = await isAssignableOrgLocation(supabase, caller.org_id, normalizedLocation);
            if (!locOk) {
                return NextResponse.json(
                    { error: "Sede invalida o inactiva. Debe existir en el catalogo de sedes de tu organizacion." },
                    { status: 400 }
                );
            }
        }
    }

    if (normalizedLocation !== undefined) {
        updates.location = normalizedLocation;
    }

    if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
            .from('org_members')
            .update(updates)
            .eq('id', id)
            .eq('org_id', caller.org_id);
        if (updateError) throw updateError;
    }

    if (body.permissions && Array.isArray(body.permissions)) {
        await supabase.from('member_module_access').delete().eq('member_id', id);
        if (body.permissions.length > 0) {
            const inserts = body.permissions.map((p: any) => ({
                org_id: caller.org_id,
                member_id: id,
                module: p.module,
                can_view: p.can_view ?? true,
                can_edit: p.can_edit ?? false,
                can_delete: p.can_delete ?? false
            }));
            const { error: insError } = await supabase.from('member_module_access').insert(inserts);
            if (insError) throw insError;
        }
    }

    return NextResponse.json({ success: true });
}, { module: "users", action: "edit" });
