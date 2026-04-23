import { createClient } from "@supabase/supabase-js";

/**
 * Creates a privileged Supabase client that bypasses Row Level Security.
 * This client should ONLY be used in secure server-side environments (e.g. Server Actions, API routes).
 * NEVER expose the service role key or this client to the browser.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
    }

    if (!serviceRoleKey) {
        throw new Error(
            "Missing privileged Supabase key. Please set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in your environment."
        );
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}
