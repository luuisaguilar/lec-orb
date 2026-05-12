import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, createAdminClientMock } = vi.hoisted(() => ({
    createClientMock: vi.fn(),
    createAdminClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: createClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: createAdminClientMock,
}));

import { GET } from "@/app/api/v1/auth/post-login-redirect/route";

type TestUser = { id: string; email?: string } | null;

function mockServerClient(params: { user: TestUser; applicatorLinked?: boolean }) {
    const { user, applicatorLinked = false } = params;

    createClientMock.mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user },
                error: user ? null : new Error("unauthorized"),
            }),
        },
        from: vi.fn((table: string) => {
            if (table !== "applicators") throw new Error(`Unexpected table: ${table}`);
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: applicatorLinked ? { id: "app-1" } : null,
                    error: null,
                }),
            };
        }),
    });
}

function mockAdminClient(params: {
    pendingPortalInvite?: { token: string } | null;
    pendingOrgInvites?: Array<{ token: string; expires_at: string | null }>;
}) {
    const {
        pendingPortalInvite = null,
        pendingOrgInvites = [],
    } = params;

    createAdminClientMock.mockReturnValue({
        from: vi.fn((table: string) => {
            if (table === "applicator_portal_invitations") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    ilike: vi.fn().mockReturnThis(),
                    gt: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockResolvedValue({
                        data: pendingPortalInvite,
                        error: null,
                    }),
                };
            }

            if (table === "org_invitations") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    ilike: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue({
                        data: pendingOrgInvites,
                        error: null,
                    }),
                };
            }

            throw new Error(`Unexpected table: ${table}`);
        }),
    });
}

describe("GET /api/v1/auth/post-login-redirect", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to /join/[token] when user has pending org invitation", async () => {
        mockServerClient({
            user: { id: "user-1", email: "INVITADO@EXAMPLE.COM" },
            applicatorLinked: false,
        });
        mockAdminClient({
            pendingPortalInvite: null,
            pendingOrgInvites: [
                {
                    token: "org-token-123",
                    expires_at: new Date(Date.now() + 60_000).toISOString(),
                },
            ],
        });

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.redirectTo).toBe("/join/org-token-123");
    });

    it("keeps /join-portal/[token] priority over org invitation", async () => {
        mockServerClient({
            user: { id: "user-1", email: "invitado@example.com" },
            applicatorLinked: false,
        });
        mockAdminClient({
            pendingPortalInvite: { token: "portal-token-001" },
            pendingOrgInvites: [
                {
                    token: "org-token-123",
                    expires_at: new Date(Date.now() + 60_000).toISOString(),
                },
            ],
        });

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.redirectTo).toBe("/join-portal/portal-token-001");
    });
});
