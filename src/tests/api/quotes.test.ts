import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/quotes/route";

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
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockResolvedValue({ data: "COT-2026-00001", error: null }),
        then: vi.fn((resolve: any) => resolve({ data: mock._data, error: mock._error })),
        _data: null,
        _error: null,
    };
    return mock;
};

describe("Quotes API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/quotes", () => {
        it("should return active quotes list", async () => {
            mockSupabase._data = [
                { id: "q1", folio: "COT-001", provider: "Proveedor X", status: "PENDING" },
                { id: "q2", folio: "COT-002", provider: "Proveedor Y", status: "APPROVED" },
            ];

            const req = new NextRequest("http://localhost/api/v1/quotes");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.quotes).toHaveLength(2);
            expect(body.quotes[0].folio).toBe("COT-001");
        });

        it("should only return active quotes", async () => {
            mockSupabase._data = [];
            const req = new NextRequest("http://localhost/api/v1/quotes");
            await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
        });
    });

    describe("POST /api/v1/quotes", () => {
        it("should create quote and return 201", async () => {
            const payload = {
                folio: "COT-2024-00001",
                provider: "Proveedor Cambridge",
                description: "Cotización de libros",
                status: "PENDING",
            };
            mockSupabase._data = { id: "q-new", ...payload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/quotes", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.quote.folio).toBe("COT-2024-00001");
            expect(mockSupabase.rpc).not.toHaveBeenCalled();
        });

        it("should generate folio via rpc when folio omitted", async () => {
            const payload = {
                provider: "Proveedor X",
                description: "Test",
                status: "PENDING",
            };
            mockSupabase._data = { id: "q-auto", folio: "COT-2026-00001", ...payload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/quotes", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(201);
            expect(mockSupabase.rpc).toHaveBeenCalledWith("fn_next_folio", {
                p_org_id: mockMember.org_id,
                p_doc_type: "QUOTE",
            });
        });

        it("should return 400 when folio format is invalid", async () => {
            const req = new NextRequest("http://localhost/api/v1/quotes", {
                method: "POST",
                body: JSON.stringify({ folio: "COT-2024-1", provider: "X" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should return 400 when status is invalid", async () => {
            const req = new NextRequest("http://localhost/api/v1/quotes", {
                method: "POST",
                body: JSON.stringify({ folio: "COT-2024-00002", status: "WRONG" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should default status to PENDING when not provided", async () => {
            mockSupabase._data = { id: "q-def", folio: "COT-2026-00002", status: "PENDING", org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/quotes", {
                method: "POST",
                body: JSON.stringify({ provider: "P", folio: "COT-2026-00002" }),
            });

            await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({ status: "PENDING" })
            );
        });

        it("should generate distinct folios on sequential POSTs without client folio", async () => {
            mockSupabase.rpc
                .mockResolvedValueOnce({ data: "COT-2026-00010", error: null })
                .mockResolvedValueOnce({ data: "COT-2026-00011", error: null });

            const base = { provider: "P", description: "", status: "PENDING" };

            mockSupabase._data = { id: "q1", folio: "COT-2026-00010", ...base, org_id: "org-uuid-001" };
            const r1 = await (POST as any)(
                new NextRequest("http://localhost/api/v1/quotes", { method: "POST", body: JSON.stringify(base) }),
                { supabase: mockSupabase, user: mockUser, member: mockMember }
            );
            expect(r1.status).toBe(201);

            mockSupabase._data = { id: "q2", folio: "COT-2026-00011", ...base, org_id: "org-uuid-001" };
            const r2 = await (POST as any)(
                new NextRequest("http://localhost/api/v1/quotes", { method: "POST", body: JSON.stringify(base) }),
                { supabase: mockSupabase, user: mockUser, member: mockMember }
            );
            expect(r2.status).toBe(201);
            expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
        });
    });
});
