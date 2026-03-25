import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/finance/budget/route";

const createMockSupabase = () => {
    const mock: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mock.data, error: mock.error })),
        data: null,
        error: null,
    };
    return mock;
};

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

describe("Budget API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "o1", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/finance/budget", () => {
        it("should return budgets", async () => {
            const req = new NextRequest("http://localhost/api/v1/finance/budget?month=3&year=2024");
            mockSupabase.data = [{ category_id: "c1", amount: 1000 }];

            const response = await GET(req, { supabase: mockSupabase, user: mockUser, member: mockMember } as any, {});
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.budgets).toHaveLength(1);
        });
    });

    describe("POST /api/v1/finance/budget", () => {
        it("should upsert budgets", async () => {
            const payload = [{ 
                category_id: "81fbc964-8d7e-4bea-8879-66b516a66a30", 
                amount: 1000, 
                month: 3, 
                year: 2024, 
                org_id: "81fbc964-8d7e-4bea-8879-66b516a66a30" 
            }];
            const req = new NextRequest("http://localhost/api/v1/finance/budget", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            mockSupabase.data = payload;

            const response = await POST(req, { supabase: mockSupabase, user: mockUser, member: mockMember } as any, {});
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.budgets).toHaveLength(1); // Expect 'budgets' key, not 'success'
        });
    });
});
