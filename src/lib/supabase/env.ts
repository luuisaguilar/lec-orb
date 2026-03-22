const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";

function readRequiredSupabaseUrl(): string {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    if (!value) {
        throw new Error(
            "[config] Missing required Supabase environment variable NEXT_PUBLIC_SUPABASE_URL. " +
            "Configure the real Supabase project values for this environment."
        );
    }

    return value;
}

function readRequiredSupabaseAnonKey(): string {
    const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!value) {
        throw new Error(
            "[config] Missing required Supabase environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
            "Configure the real Supabase project values for this environment."
        );
    }

    return value;
}

export function getSupabasePublicEnv() {
    const url = readRequiredSupabaseUrl();
    const anonKey = readRequiredSupabaseAnonKey();

    if (url === PLACEHOLDER_SUPABASE_URL) {
        throw new Error(
            "[config] NEXT_PUBLIC_SUPABASE_URL must be a real Supabase project URL. " +
            "Placeholder values are not allowed outside documentation/examples."
        );
    }

    return { url, anonKey };
}
