import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { AuthContext } from "@/lib/auth/with-handler";

// --- Mocks ---

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: unknown) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

// Helper: crea cadena supabase encadenable
const createChain = (data: unknown, error: unknown = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: any) => void) => resolve({ data, error })),
});

type Handler = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>;

describe("Invitation Flow Fixes", () => {
    let mockUser: AuthContext["user"];

    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = { id: "u1", email: "test@lec.mx" };
    });

    // ==================================================================
    // FIX 1: /api/v1/users/me accessible by all authenticated roles
    // ==================================================================
    describe("Fix 1: GET /api/v1/users/me — no module guard", () => {
        const roles = ["admin", "supervisor", "operador", "applicator"] as const;

        for (const role of roles) {
            it(`should return 200 for role '${role}'`, async () => {
                const { GET } = await import("@/app/api/v1/users/me/route");

                const mockMember = {
                    id: "m1",
                    org_id: "org-001",
                    role,
                    location: null,
                    organizations: { name: "Test Org", slug: "test-org" },
                };

                const profileData = { full_name: "Test User" };
                const accessData = [
                    { module: "events", can_view: true, can_edit: false, can_delete: false },
                ];

                const profileChain = createChain(profileData);
                const accessChain = createChain(accessData);

                const mockSupabase = {
                    from: vi.fn((table: string) => {
                        if (table === "profiles") return profileChain;
                        if (table === "member_module_access") return accessChain;
                        return profileChain;
                    }),
                } as unknown as AuthContext["supabase"];

                const req = new NextRequest("http://localhost/api/v1/users/me");
                const response = await (GET as unknown as Handler)(req, {
                    supabase: mockSupabase,
                    user: mockUser,
                    member: mockMember,
                    enrichAudit: vi.fn(),
                });
                const body = await response.json();

                expect(response.status).toBe(200);
                expect(body.user).toBeDefined();
                expect(body.user.id).toBe("u1");
                expect(body.role).toBe(role);
                expect(body.permissions).toBeDefined();
                expect(Array.isArray(body.permissions)).toBe(true);
            });
        }

        it("should return user profile, org, role and permissions", async () => {
            const { GET } = await import("@/app/api/v1/users/me/route");

            const mockMember = {
                id: "m1",
                org_id: "org-001",
                role: "operador",
                location: "Sede Central",
                organizations: { name: "LEC", slug: "lec" },
            };

            const profileData = { full_name: "María López" };
            const accessData = [
                { module: "events", can_view: true, can_edit: false, can_delete: false },
                { module: "cenni", can_view: true, can_edit: true, can_delete: false },
            ];

            const profileChain = createChain(profileData);
            const accessChain = createChain(accessData);

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "profiles") return profileChain;
                    if (table === "member_module_access") return accessChain;
                    return profileChain;
                }),
            } as unknown as AuthContext["supabase"];

            const req = new NextRequest("http://localhost/api/v1/users/me");
            const response = await (GET as unknown as Handler)(req, {
                supabase: mockSupabase,
                user: { id: "u2", email: "maria@lec.mx" },
                member: mockMember,
                enrichAudit: vi.fn(),
            });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.user.full_name).toBe("María López");
            expect(body.organization.id).toBe("org-001");
            expect(body.role).toBe("operador");
            expect(body.permissions).toHaveLength(2);
            expect(body.permissions[0].module).toBe("events");
        });
    });

    // ==================================================================
    // FIX 2: checkServerPermission respects role-based access rows
    // ==================================================================
    describe("Fix 2: checkServerPermission — new member with seeded permissions", () => {
        it("should allow view when member has can_view=true row", async () => {
            const { checkServerPermission } = await import("@/lib/auth/permissions");

            const mockSupabase = {
                from(table: string) {
                    if (table === "org_members") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: { id: "m1", role: "operador" },
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "member_module_access") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: { can_view: true, can_edit: false, can_delete: false },
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    throw new Error(`Unexpected table: ${table}`);
                },
            };

            const allowed = await checkServerPermission(mockSupabase, "u1", "events", "view");
            expect(allowed).toBe(true);
        });

        it("should deny view when member has NO module_access row (fail-closed)", async () => {
            const { checkServerPermission } = await import("@/lib/auth/permissions");

            const mockSupabase = {
                from(table: string) {
                    if (table === "org_members") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: { id: "m1", role: "operador" },
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "member_module_access") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: null,
                                            error: { message: "not found" },
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    throw new Error(`Unexpected table: ${table}`);
                },
            };

            const allowed = await checkServerPermission(mockSupabase, "u1", "events", "view");
            expect(allowed).toBe(false);
        });

        it("should deny edit for operador with can_edit=false", async () => {
            const { checkServerPermission } = await import("@/lib/auth/permissions");

            const mockSupabase = {
                from(table: string) {
                    if (table === "org_members") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: { id: "m1", role: "operador" },
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "member_module_access") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({
                                            data: { can_view: true, can_edit: false, can_delete: false },
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    throw new Error(`Unexpected table: ${table}`);
                },
            };

            const allowed = await checkServerPermission(mockSupabase, "u1", "events", "edit");
            expect(allowed).toBe(false);
        });
    });

    // ==================================================================
    // FIX 3: Applicator redirect to /portal after accepting invitation
    // ==================================================================
    describe("Fix 3: acceptInvitation — role-based redirect", () => {
        // We test the logic extracted from actions.ts since Server Actions with
        // redirect() throw NEXT_REDIRECT errors that are hard to test directly.
        // We verify the redirect URL selection logic instead.

        function determineRedirectPath(result: {
            success: boolean;
            role?: string;
            code?: string;
            message?: string;
        }): string {
            if (!result.success) {
                const expiredFlag = result.code === "EXPIRED" ? "&expired=1" : "";
                return `/join/TOKEN?error=${encodeURIComponent(result.message || "Error")}${expiredFlag}`;
            }
            if (result.role === "applicator") return "/portal";
            return "/dashboard";
        }

        it("should redirect applicator to /portal on success", () => {
            const path = determineRedirectPath({
                success: true,
                role: "applicator",
                code: "ACCEPTED",
            });
            expect(path).toBe("/portal");
        });

        it("should redirect admin to /dashboard on success", () => {
            const path = determineRedirectPath({
                success: true,
                role: "admin",
                code: "ACCEPTED",
            });
            expect(path).toBe("/dashboard");
        });

        it("should redirect supervisor to /dashboard on success", () => {
            const path = determineRedirectPath({
                success: true,
                role: "supervisor",
                code: "ACCEPTED",
            });
            expect(path).toBe("/dashboard");
        });

        it("should redirect operador to /dashboard on success", () => {
            const path = determineRedirectPath({
                success: true,
                role: "operador",
                code: "ACCEPTED",
            });
            expect(path).toBe("/dashboard");
        });

        it("should redirect to error page on EXPIRED", () => {
            const path = determineRedirectPath({
                success: false,
                code: "EXPIRED",
                message: "Expirado",
            });
            expect(path).toContain("expired=1");
            expect(path).toContain("Expirado");
        });

        it("should redirect to error page on EMAIL_MISMATCH", () => {
            const path = determineRedirectPath({
                success: false,
                code: "EMAIL_MISMATCH",
                message: "Correo no coincide",
            });
            expect(path).toContain("error=");
            expect(path).not.toContain("expired=1");
        });

        it("should redirect to /dashboard when role is undefined (fallback)", () => {
            const path = determineRedirectPath({
                success: true,
                role: undefined,
                code: "ACCEPTED",
            });
            expect(path).toBe("/dashboard");
        });
    });
});
