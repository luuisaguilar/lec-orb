import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/v1/applicators/[id]/invite/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

vi.mock("@/lib/email/resend", () => ({
    sendApplicatorPortalInviteEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

vi.mock("@/lib/env/app-url", () => ({
    resolveAppOrigin: vi.fn(() => "https://app.test"),
}));

import { sendApplicatorPortalInviteEmail } from "@/lib/email/resend";

describe("POST /api/v1/applicators/[id]/invite", () => {
    const mockUser = { id: "u1" };
    let mockMember: { id: string; org_id: string; role: string };

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
    });

    function buildSupabase(applicator: {
        id: string;
        org_id: string;
        name: string;
        email: string | null;
        auth_user_id: string | null;
    } | null) {
        let applicatorPortalFromCount = 0;
        return {
            from: vi.fn((table: string) => {
                if (table === "applicators") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    is: vi.fn(() => ({
                                        single: vi.fn(() =>
                                            Promise.resolve({
                                                data: applicator,
                                                error: applicator ? null : { message: "not found" },
                                            })
                                        ),
                                    })),
                                })),
                            })),
                        })),
                    };
                }
                if (table === "applicator_portal_invitations") {
                    applicatorPortalFromCount += 1;
                    if (applicatorPortalFromCount === 1) {
                        return {
                            update: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    eq: vi.fn(() => Promise.resolve({ error: null })),
                                })),
                            })),
                        };
                    }
                    return {
                        insert: vi.fn(() => ({
                            select: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: { id: "inv-new", token: "tok-invite-test-123456789012" },
                                        error: null,
                                    })
                                ),
                            })),
                        })),
                    };
                }
                if (table === "organizations") {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({ data: { name: "Org Demo" }, error: null })
                                ),
                            })),
                        })),
                    };
                }
                return {};
            }),
        };
    }

    it("creates invitation and returns joinUrl", async () => {
        const applicator = {
            id: "app-1",
            org_id: "org-uuid-001",
            name: "Ana López",
            email: "ana@test.com",
            auth_user_id: null,
        };
        const mockSupabase = buildSupabase(applicator);

        const req = new NextRequest("http://localhost/api/v1/applicators/app-1/invite", {
            method: "POST",
            body: JSON.stringify({ sendEmail: true }),
        });
        const res = await (POST as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: "app-1" }) }
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.joinUrl).toBe("https://app.test/join-portal/tok-invite-test-123456789012");
        expect(body.emailSent).toBe(true);
        expect(sendApplicatorPortalInviteEmail).toHaveBeenCalled();
    });

    it("returns 403 for operador", async () => {
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "operador" };
        const mockSupabase = buildSupabase({
            id: "app-1",
            org_id: "org-uuid-001",
            name: "Ana",
            email: "ana@test.com",
            auth_user_id: null,
        });

        const req = new NextRequest("http://localhost/api/v1/applicators/app-1/invite", {
            method: "POST",
            body: JSON.stringify({}),
        });
        const res = await (POST as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: "app-1" }) }
        );

        expect(res.status).toBe(403);
    });

    it("returns 409 when applicator already linked", async () => {
        const mockSupabase = buildSupabase({
            id: "app-1",
            org_id: "org-uuid-001",
            name: "Ana",
            email: "ana@test.com",
            auth_user_id: "auth-999",
        });

        const req = new NextRequest("http://localhost/api/v1/applicators/app-1/invite", {
            method: "POST",
            body: JSON.stringify({}),
        });
        const res = await (POST as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: "app-1" }) }
        );

        expect(res.status).toBe(409);
    });

    it("returns 404 when applicator missing", async () => {
        const mockSupabase = buildSupabase(null);

        const req = new NextRequest("http://localhost/api/v1/applicators/missing/invite", {
            method: "POST",
            body: JSON.stringify({}),
        });
        const res = await (POST as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: "missing" }) }
        );

        expect(res.status).toBe(404);
    });
});
