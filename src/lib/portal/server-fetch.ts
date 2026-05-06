import { cookies, headers } from "next/headers";

export type PortalFetchResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; message: string };

/**
 * Server-only fetch to /api/v1/portal/* with the caller's cookies (session).
 */
export async function portalApiGet<T>(pathname: string): Promise<PortalFetchResult<T>> {
    const h = await headers();
    const forwardedHost = h.get("x-forwarded-host");
    const host = forwardedHost ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const base = fromEnv ?? `${proto}://${host}`;
    const url = `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
        .join("; ");

    const res = await fetch(url, {
        headers: {
            cookie: cookieHeader,
        },
        cache: "no-store",
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        return {
            ok: false,
            status: res.status,
            message: typeof body?.error === "string" ? body.error : res.statusText,
        };
    }

    return { ok: true, data: body as T };
}
