import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/settings/role-rates/route";
import { PATCH, DELETE } from "@/app/api/v1/settings/role-rates/[id]/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

vi.mock("@/lib/demo/config", () => ({
    DEMO_MODE: false,
    DEMO_USER: { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
    DEMO_ORG: { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
    DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));

describe("Role rates API", () => {
    const mockUser = { id: "u1" };
    let mockMember: { id: string; org_id: string; role: string };

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
    });

    it("GET returns rates for org", async () => {
        const rates = [
            {
                id: "r1",
                org_id: "org-uuid-001",
                role: "INVIGILATOR",
                exam_type: null,
                rate_per_hour: 100,
                effective_from: "2024-01-01",
                effective_to: null,
                notes: null,
            },
        ];
        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => ({
                            order: vi.fn(() => ({
                                then: (fn: (v: { data: typeof rates; error: null }) => unknown) =>
                                    Promise.resolve({ data: rates, error: null }).then(fn),
                            })),
                        })),
                    })),
                })),
            })),
        };

        const req = new NextRequest("http://localhost/api/v1/settings/role-rates");
        const res = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.rates).toHaveLength(1);
        expect(body.rates[0].role).toBe("INVIGILATOR");
    });

    it("POST creates rate for admin", async () => {
        const inserted = {
            id: "new-1",
            org_id: "org-uuid-001",
            role: "SUPERVISOR",
            exam_type: null,
            rate_per_hour: 200,
            effective_from: "2025-01-01",
            effective_to: null,
            notes: null,
        };
        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(() => Promise.resolve({ data: inserted, error: null })),
                    })),
                })),
            })),
        };

        const req = new NextRequest("http://localhost/api/v1/settings/role-rates", {
            method: "POST",
            body: JSON.stringify({
                role: "SUPERVISOR",
                rate_per_hour: 200,
                effective_from: "2025-01-01",
            }),
        });
        const res = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.rate.id).toBe("new-1");
    });

    it("POST returns 403 for operador", async () => {
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "operador" };
        const mockSupabase = { from: vi.fn() };

        const req = new NextRequest("http://localhost/api/v1/settings/role-rates", {
            method: "POST",
            body: JSON.stringify({ role: "INVIGILATOR", rate_per_hour: 100 }),
        });
        const res = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

        expect(res.status).toBe(403);
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("PATCH updates rate", async () => {
        const existing = {
            id: "r1",
            org_id: "org-uuid-001",
            role: "INVIGILATOR",
            rate_per_hour: 100,
            exam_type: null,
            effective_from: "2024-01-01",
            effective_to: null,
            notes: null,
        };
        const updated = { ...existing, rate_per_hour: 120 };
        let fromCalls = 0;
        const mockSupabase = {
            from: vi.fn(() => {
                fromCalls += 1;
                if (fromCalls === 1) {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() => Promise.resolve({ data: existing, error: null })),
                                })),
                            })),
                        })),
                    };
                }
                return {
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                select: vi.fn(() => ({
                                    single: vi.fn(() => Promise.resolve({ data: updated, error: null })),
                                })),
                            })),
                        })),
                    })),
                };
            }),
        };

        const req = new NextRequest("http://localhost/api/v1/settings/role-rates/r1", {
            method: "PATCH",
            body: JSON.stringify({ rate_per_hour: 120 }),
        });
        const res = await (PATCH as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: "r1" }) }
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.rate.rate_per_hour).toBe(120);
    });

    it("PATCH returns 404 when missing", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => Promise.resolve({ data: null, error: { message: "none" } })),
                        })),
                    })),
                })),
            })),
        };

        const req = new NextRequest("http://localhost/api/v1/settings/role-rates/missing", {
            method: "PATCH",
            body: JSON.stringify({ rate_per_hour: 1 }),
        });
        const res = await (PATCH as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: "missing" }) }
        );

        expect(res.status).toBe(404);
    });

    it("DELETE removes rate", async () => {
        const existing = {
            id: "r1",
            org_id: "org-uuid-001",
            role: "INVIGILATOR",
            rate_per_hour: 100,
            exam_type: null,
            effective_from: "2024-01-01",
            effective_to: null,
            notes: null,
        };
        let fromCalls = 0;
        const mockSupabase = {
            from: vi.fn(() => {
                fromCalls += 1;
                if (fromCalls === 1) {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() => Promise.resolve({ data: existing, error: null })),
                                })),
                            })),
                        })),
                    };
                }
                return {
                    delete: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => Promise.resolve({ error: null })),
                        })),
                    })),
                };
            }),
        };

        const req = new NextRequest("http://localhost/api/v1/settings/role-rates/r1", { method: "DELETE" });
        const res = await (DELETE as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: "r1" }) }
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
    });
});
