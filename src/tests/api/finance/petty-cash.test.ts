import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/finance/petty-cash/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

function makeMovementsChain(result: { data: unknown; error: unknown; count?: number | null }) {
    const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: result.data, error: result.error }),
        range: vi.fn().mockResolvedValue({
            data: result.data,
            error: result.error,
            count: result.count ?? null,
        }),
    };
    return chain;
}

describe("Petty Cash API Route (V2)", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    const orgUuid = "81fbc964-8d7e-4bea-8879-66b516a66a30";
    const fundUuid = "81fbc964-8d7e-4bea-8879-66b516a66a50";

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = {
            id: "m1",
            org_id: orgUuid,
            role: "admin",
            location: null,
            organizations: null,
        };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/finance/petty-cash", () => {
        it("should return movements list", async () => {
            const req = new NextRequest(`http://localhost/api/v1/finance/petty-cash?fund_id=${fundUuid}`);
            mockSupabase = {
                from: vi.fn(() =>
                    makeMovementsChain({
                        data: [{ id: "mov1", concept: "Test", amount_out: 50, movement_date: "2026-01-01" }],
                        error: null,
                        count: 1,
                    })
                ),
            };

            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember }, {});
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.movements).toHaveLength(1);
        });
    });

    describe("POST /api/v1/finance/petty-cash", () => {
        it("should create an income movement", async () => {
            const fundChain: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                        id: fundUuid,
                        org_id: orgUuid,
                        status: "open",
                        current_balance: 100,
                    },
                    error: null,
                }),
            };
            const insertRow = {
                id: "new-id",
                org_id: "o1",
                concept: "Ingreso",
                amount_in: 200,
                amount_out: 0,
                movement_date: "2026-03-01",
            };
            const movChain: any = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: insertRow, error: null }),
            };
            let tableCalls = 0;
            mockSupabase = {
                from: vi.fn((t: string) => {
                    tableCalls++;
                    if (t === "petty_cash_funds") return fundChain;
                    return movChain;
                }),
            };

            const payload = {
                org_id: orgUuid,
                fund_id: fundUuid,
                movement_date: "2026-03-01",
                concept: "Ingreso",
                amount_in: 200,
                amount_out: 0,
                budget_line_id: null,
            };
            const req = new NextRequest("http://localhost/api/v1/finance/petty-cash", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember }, {});
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.movement.concept).toBe("Ingreso");
        });
    });
});
