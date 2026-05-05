import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfiguredAppOrigin, getEmailRedirectOrigin, resolveAppOrigin } from "@/lib/env/app-url";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("app URL resolution", () => {
    it("uses NEXT_PUBLIC_APP_URL when configured", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.lec.mx/");

        expect(getConfiguredAppOrigin()).toBe("https://staging.lec.mx");
        expect(resolveAppOrigin()).toBe("https://staging.lec.mx");
        expect(getEmailRedirectOrigin()).toBe("https://staging.lec.mx");
    });

    it("derives the origin from forwarded request headers when the env var is absent", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        vi.stubEnv("NODE_ENV", "production");

        const request = new NextRequest("https://internal.vercel.app/api/v1/invitations", {
            headers: {
                "x-forwarded-host": "preview-feature-123.vercel.app",
                "x-forwarded-proto": "https",
            },
        });

        expect(resolveAppOrigin(request)).toBe("https://preview-feature-123.vercel.app");
    });

    it("falls back to the local dev origin outside production when no request is available", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        vi.stubEnv("NODE_ENV", "development");

        expect(resolveAppOrigin()).toBe("http://localhost:3000");
    });

    it("getEmailRedirectOrigin uses window.location when NEXT_PUBLIC_APP_URL is unset", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

        expect(getEmailRedirectOrigin()).toBe(window.location.origin);
    });

    it("throws in production when neither env nor request origin is available", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        vi.stubEnv("NODE_ENV", "production");

        expect(() => resolveAppOrigin()).toThrow(
            "NEXT_PUBLIC_APP_URL is not configured and the runtime request origin could not be determined."
        );
    });
});
