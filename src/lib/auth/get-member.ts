/**
 * getAuthenticatedMember
 * ----------------------
 * Centralizes the repeated auth + org-membership check pattern used in every
 * API route. Returns { user, member } on success or throws a NextResponse so
 * route handlers can do:
 *
 *   const { user, member } = await getAuthenticatedMember(supabase);
 *
 * Note: this function does NOT throw — it returns a discriminated union so
 * callers can early-return in a type-safe way without try/catch.
 */

import { NextResponse } from "next/server";

export type MemberResult =
    | { ok: true; user: { id: string; email?: string }; member: { id: string; org_id: string; role: string; location: string | null } }
    | { ok: false; response: NextResponse };

/**
 * Validates the current Supabase session and returns the authenticated user
 * plus their org_member record.
 *
 * @param supabase - An authenticated Supabase server client
 * @returns MemberResult — check `result.ok` before using `result.user` / `result.member`
 *
 * @example
 * const auth = await getAuthenticatedMember(supabase);
 * if (!auth.ok) return auth.response;
 * const { user, member } = auth;
 */
export async function getAuthenticatedMember(supabase: any): Promise<MemberResult> {
    // 1. Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    // 2. Fetch org membership
    const { data: member, error: memberError } = await supabase
        .from("org_members")
        .select("id, org_id, role, location")
        .eq("user_id", user.id)
        .single();

    if (memberError || !member) {
        return {
            ok: false,
            response: NextResponse.json({ error: "No organization found" }, { status: 403 }),
        };
    }

    return { ok: true, user, member };
}
