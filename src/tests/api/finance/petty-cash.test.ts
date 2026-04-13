import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/finance/petty-cash/route";

// --- Mocks ---

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

const createMockSupabase = () => {
    const mock: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mock.data, error: mock.error, count: mock.count })),
        data: null,
        error: null,
        count: 0
    };
    return mock;
};

describe("Petty Cash API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "o1", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/finance/petty-cash", () => {
        it("should return movements list", async () => {
            const req = new NextRequest("http://localhost/api/v1/finance/petty-cash");
            mockSupabase.data = [{ id: "mov1", concept: "Test", petty_cash_categories: { name: "Cat1" } }];
            mockSupabase.count = 1;

            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember }, {});
            
            // In Vitest/Next.js integration, response might be a Response object
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.movements).toHaveLength(1);
        });
    });

    describe("POST /api/v1/finance/petty-cash", () => {
        it("should create a new movement", async () => {
            const payload = {
                org_id: "81fbc964-8d7e-4bea-8879-66b516a66a30", // Use valid UUID for Zod
                category_id: "81fbc964-8d7e-4bea-8879-66b516a66a30",
                date: "2024-03-01",
                concept: "Nuevo Gasto",
                type: "EXPENSE",
                amount: 500
            };
            const req = new NextRequest("http://localhost/api/v1/finance/petty-cash", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            mockSupabase.data = { ...payload, id: "new-id" };

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember }, {});
            const body = await response.json();

            expect(response.status).toBe(201); // Based on implementation (returned 201)
            expect(body.movement.concept).toBe("Nuevo Gasto");
        });
    });
});
