import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolveInviteJobResult =
    | { ok: true; job_title: string; hr_profile_id: string | null }
    | { ok: false; status: number; error: string };

export async function resolveInviteJobFields(
    supabase: SupabaseClient,
    orgId: string,
    params: {
        hr_profile_id: string | null | undefined;
        job_title: string | null | undefined;
    }
): Promise<ResolveInviteJobResult> {
    const inviteHrProfileId = params.hr_profile_id ?? null;

    if (inviteHrProfileId) {
        const { data: hp, error: hpError } = await supabase
            .from("hr_profiles")
            .select("id, role_title")
            .eq("id", inviteHrProfileId)
            .eq("org_id", orgId)
            .maybeSingle();

        if (hpError) throw hpError;
        if (!hp) {
            return {
                ok: false,
                status: 400,
                error: "Perfil de puesto (RRHH) invalido o no pertenece a tu organizacion.",
            };
        }
        const fromProfile = hp.role_title?.trim() ? hp.role_title.trim() : null;
        if (!fromProfile) {
            return {
                ok: false,
                status: 400,
                error: "El perfil HR no tiene titulo de puesto definido.",
            };
        }
        return { ok: true, job_title: fromProfile, hr_profile_id: inviteHrProfileId };
    }

    const manualTitle = params.job_title?.trim() ? params.job_title.trim() : null;
    if (!manualTitle) {
        return { ok: false, status: 400, error: "Rol empresa requerido." };
    }
    return { ok: true, job_title: manualTitle, hr_profile_id: null };
}
