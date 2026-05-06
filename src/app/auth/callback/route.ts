import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Same-origin path only (blocks protocol-relative //host and absolute URLs). */
function safeAppPath(next: string | null, fallback = "/dashboard"): string {
    if (next == null || next === "") return fallback;
    const trimmed = next.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
    try {
        const resolved = new URL(trimmed, "https://placeholder.local");
        if (resolved.origin !== "https://placeholder.local") return fallback;
    } catch {
        return fallback;
    }
    return trimmed;
}


/**
 * OAuth / magic-link callback: exchanges ?code= for a session and redirects to ?next=
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = safeAppPath(searchParams.get("next"));

    if (!code) {
        return NextResponse.redirect(new URL("/login?error=auth", origin));
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        /* ignore when called outside request context */
                    }
                },
            },
        }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
        );
    }

    return NextResponse.redirect(new URL(next, origin));
}
