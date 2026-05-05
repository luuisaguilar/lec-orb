import { NextRequest } from "next/server";

const LOCALHOST_ORIGIN = "http://localhost:3000";

function normalizeOrigin(value?: string | null): string | null {
    const trimmed = value?.trim();

    if (!trimmed) {
        return null;
    }

    try {
        const url = new URL(trimmed);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return null;
        }

        url.pathname = "";
        url.search = "";
        url.hash = "";

        return url.toString().replace(/\/$/, "");
    } catch {
        return null;
    }
}

function resolveRequestOrigin(req: NextRequest): string | null {
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost ?? req.headers.get("host") ?? req.nextUrl.host;
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const protocol = forwardedProto ?? req.nextUrl.protocol.replace(/:$/, "");

    if (host) {
        const forwardedOrigin = normalizeOrigin(`${protocol}://${host}`);

        if (forwardedOrigin) {
            return forwardedOrigin;
        }
    }

    return normalizeOrigin(req.nextUrl.origin);
}

export function getConfiguredAppOrigin(): string | null {
    return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
}

export function resolveAppOrigin(req?: NextRequest): string {
    const configuredOrigin = getConfiguredAppOrigin();

    if (configuredOrigin) {
        return configuredOrigin;
    }

    if (req) {
        const requestOrigin = resolveRequestOrigin(req);

        if (requestOrigin) {
            return requestOrigin;
        }
    }

    if (process.env.NODE_ENV !== "production") {
        return LOCALHOST_ORIGIN;
    }

    throw new Error(
        "NEXT_PUBLIC_APP_URL is not configured and the runtime request origin could not be determined."
    );
}

/**
 * Absolute origin for Supabase email links (confirm signup, recovery, etc.).
 * Prefer NEXT_PUBLIC_APP_URL so messages sent from production never point at localhost.
 */
export function getEmailRedirectOrigin(): string {
    const configured = getConfiguredAppOrigin();
    if (configured) {
        return configured;
    }
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    throw new Error(
        "getEmailRedirectOrigin: set NEXT_PUBLIC_APP_URL or call from the browser."
    );
}
