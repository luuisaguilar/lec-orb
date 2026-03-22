const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";

function readRequiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(
            `[config] Missing required Supabase environment variable ${name}. ` +
            "Configure the real Supabase project values for this environment."
        );
    }

    return value;
}

export function getSupabasePublicEnv() {
    const url = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    if (url === PLACEHOLDER_SUPABASE_URL) {
        throw new Error(
            "[config] NEXT_PUBLIC_SUPABASE_URL must be a real Supabase project URL. " +
            "Placeholder values are not allowed outside documentation/examples."
        );
    }

    return { url, anonKey };
}
