import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/v1/settings/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/demo/config", () => ({
    DEMO_MODE: false,
    DEMO_USER: { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
    DEMO_ORG: { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
    DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));

const makeChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

describe("Settings API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/settings", () => {
        it("should return user settings", async () => {
            const settingsData = { locale: "es-MX", theme: "dark" };
            const mockSupabase = { from: vi.fn(() => makeChain(settingsData)) };

            const req = new NextRequest("http://localhost/api/v1/settings");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.locale).toBe("es-MX");
            expect(body.theme).toBe("dark");
        });

        it("should return default settings when user has no saved settings", async () => {
            const mockSupabase = { from: vi.fn(() => makeChain(null, { message: "no rows" })) };

            const req = new NextRequest("http://localhost/api/v1/settings");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.locale).toBe("es-MX");
            expect(body.theme).toBe("system");
        });
    });

    describe("PUT /api/v1/settings", () => {
        it("should update settings successfully", async () => {
            const mockSupabase = { from: vi.fn(() => makeChain(null)) };

            const req = new NextRequest("http://localhost/api/v1/settings", {
                method: "PUT",
                body: JSON.stringify({ locale: "en-US", theme: "light" }),
            });

            const response = await (PUT as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.locale).toBe("en-US");
            expect(body.theme).toBe("light");
        });

        it("should return 400 when locale is invalid", async () => {
            const mockSupabase = { from: vi.fn() };

            const req = new NextRequest("http://localhost/api/v1/settings", {
                method: "PUT",
                body: JSON.stringify({ locale: "fr-FR", theme: "light" }), // locale no permitido
            });

            const response = await (PUT as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toContain("Invalid locale");
        });

        it("should return 400 when theme is invalid", async () => {
            const mockSupabase = { from: vi.fn() };

            const req = new NextRequest("http://localhost/api/v1/settings", {
                method: "PUT",
                body: JSON.stringify({ locale: "es-MX", theme: "rainbow" }), // theme no permitido
            });

            const response = await (PUT as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toContain("Invalid theme");
        });

        it("should default to es-MX and system when body is empty", async () => {
            const mockSupabase = { from: vi.fn(() => makeChain(null)) };

            const req = new NextRequest("http://localhost/api/v1/settings", {
                method: "PUT",
                body: JSON.stringify({}),
            });

            const response = await (PUT as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.locale).toBe("es-MX");
            expect(body.theme).toBe("system");
        });
    });
});
