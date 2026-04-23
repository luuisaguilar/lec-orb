import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/v1/payroll/route";

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
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

describe("Payroll API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/payroll (list periods)", () => {
        it("should return all payroll periods", async () => {
            const periodsData = [
                { id: "per1", name: "Quincena 1 Enero 2024", start_date: "2024-01-01", org_id: "org-uuid-001" },
                { id: "per2", name: "Quincena 2 Enero 2024", start_date: "2024-01-16", org_id: "org-uuid-001" },
            ];
            const mockSupabase = { from: vi.fn(() => makeChain(periodsData)) };

            const req = new NextRequest("http://localhost/api/v1/payroll");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.periods).toHaveLength(2);
            expect(body.total).toBe(2);
        });

        it("should return empty periods when none exist", async () => {
            const mockSupabase = { from: vi.fn(() => makeChain([])) };

            const req = new NextRequest("http://localhost/api/v1/payroll");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.total).toBe(0);
        });
    });

    describe("GET /api/v1/payroll?periodId=... (period detail)", () => {
        it("should return period with its entries", async () => {
            const periodData = { id: "per1", name: "Quincena 1", org_id: "org-uuid-001" };
            const entriesData = [
                { id: "ent1", period_id: "per1", applicator_id: "a1", total: 500 },
                { id: "ent2", period_id: "per1", applicator_id: "a2", total: 750 },
            ];

            const periodChain = makeChain(periodData);
            const entriesChain = makeChain(entriesData);

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => callCount++ === 0 ? periodChain : entriesChain),
            };

            const req = new NextRequest("http://localhost/api/v1/payroll?periodId=per1");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.period.name).toBe("Quincena 1");
            expect(body.entries).toHaveLength(2);
        });

        it("should return 404 when period not found", async () => {
            const mockSupabase = { from: vi.fn(() => makeChain(null)) };

            const req = new NextRequest("http://localhost/api/v1/payroll?periodId=not-exist");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(404);
            expect(body.error).toContain("not found");
        });
    });
});
