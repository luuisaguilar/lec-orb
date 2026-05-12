import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "@/app/api/v1/finance/petty-cash/route";
import { PATCH } from "@/app/api/v1/finance/petty-cash/replenishments/[id]/route";
import { AuthContext } from "@/lib/auth/with-handler";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: unknown) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

type RouteHandler = (req: NextRequest, ctx: AuthContext, nextCtx?: unknown) => Promise<NextResponse>;

function makeQueryChain(result: { data: unknown; error: unknown; count?: number | null }) {
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
            data: Array.isArray(result.data) ? result.data : null,
            error: result.error,
            count: result.count ?? null,
        }),
    };
    return chain;
}

describe("Petty cash V2 API", () => {
    let mockMember: AuthContext["member"];
    let mockUser: AuthContext["user"];

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = {
            id: "m1",
            org_id: "81fbc964-8d7e-4bea-8879-66b516a66a30",
            role: "admin",
            location: "CDMX",
            organizations: { name: "Test Org", slug: "test-org" },
        };
        mockUser = { id: "81fbc964-8d7e-4bea-8879-66b516a66a31" };
    });

    it("GET returns movements", async () => {
        const row = {
            id: "mov1",
            movement_date: "2026-05-01",
            concept: "Test",
            amount_in: 0,
            amount_out: 100,
            balance_after: 900,
            status: "posted",
        };
        const chain = makeQueryChain({ data: [row], error: null, count: 1 });
        const mockSupabase = { from: vi.fn(() => chain) } as unknown as AuthContext["supabase"];

            const req = new NextRequest(
            `http://localhost/api/v1/finance/petty-cash?org_id=${mockMember.org_id}&fund_id=81fbc964-8d7e-4bea-8879-66b516a66a50`
        );
        const res = await (GET as unknown as RouteHandler)(req, {
            supabase: mockSupabase,
            user: mockUser,
            member: mockMember,
            enrichAudit: vi.fn(),
        }, {});
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.movements).toHaveLength(1);
        expect(body.movements[0].concept).toBe("Test");
    });

    it("POST egreso sin budget_line_id returns 400", async () => {
        const fundChain: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "fund-1", org_id: mockMember.org_id, status: "open", current_balance: 5000 },
                error: null,
            }),
        };
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "petty_cash_funds") return fundChain;
                return makeQueryChain({ data: null, error: null });
            }),
        } as unknown as AuthContext["supabase"];

        const req = new NextRequest("http://localhost/api/v1/finance/petty-cash", {
            method: "POST",
            body: JSON.stringify({
                org_id: mockMember.org_id,
                fund_id: "81fbc964-8d7e-4bea-8879-66b516a66a40",
                movement_date: "2026-05-10",
                concept: "Gasto",
                amount_in: 0,
                amount_out: 100,
                budget_line_id: null,
            }),
        });

        const res = await (POST as unknown as RouteHandler)(req, {
            supabase: mockSupabase,
            user: mockUser,
            member: mockMember,
            enrichAudit: vi.fn(),
        }, {});
        expect(res.status).toBe(400);
    });

    it("PATCH replenishment approve calls update", async () => {
        const selChain: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "rep1", org_id: mockMember.org_id, status: "pending" },
                error: null,
            }),
        };
        const updChain: any = {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: "rep1", status: "approved" },
                error: null,
            }),
        };
        let calls = 0;
        const mockSupabase = {
            from: vi.fn(() => {
                calls++;
                return calls === 1 ? selChain : updChain;
            }),
        } as unknown as AuthContext["supabase"];

        const req = new NextRequest("http://localhost/api/v1/finance/petty-cash/replenishments/rep1", {
            method: "PATCH",
            body: JSON.stringify({ action: "approve" }),
        });

        const res = await (PATCH as unknown as RouteHandler)(req, {
            supabase: mockSupabase,
            user: mockUser,
            member: mockMember,
            enrichAudit: vi.fn(),
        }, { params: Promise.resolve({ id: "rep1" }) });

        expect(res.status).toBe(200);
        expect(updChain.update).toHaveBeenCalled();
    });
});
