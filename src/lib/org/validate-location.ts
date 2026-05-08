import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns true if `name` is null/blank or matches an active org_locations row (exact name match for org).
 */
export async function isAssignableOrgLocation(
    supabase: SupabaseClient,
    orgId: string,
    name: string | null
): Promise<boolean> {
    if (name === null || name === undefined) return true;
    const t = name.trim();
    if (t.length === 0) return true;

    const { data, error } = await supabase
        .from("org_locations")
        .select("id")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .eq("name", t)
        .maybeSingle();

    if (error) throw error;
    return !!data;
}
