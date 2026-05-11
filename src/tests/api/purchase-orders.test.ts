import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/purchase-orders/route";

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
        rpc: vi.fn().mockResolvedValue({ data: "OC-2026-00001", error: null }),
        then: vi.fn((resolve: any) => resolve({ data: mock._data, error: mock._error })),
        _data: null,
        _error: null,
    };
    return mock;
};

describe("Purchase Orders API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/purchase-orders", () => {
        it("should return purchase orders list", async () => {
            mockSupabase._data = [
                { id: "po1", folio: "OC-001", provider: "Proveedor A", status: "PENDING", quotes: { folio: "Q-001" } },
                { id: "po2", folio: "OC-002", provider: "Proveedor B", status: "COMPLETED", quotes: null },
            ];

            const req = new NextRequest("http://localhost/api/v1/purchase-orders");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.orders).toHaveLength(2);
            expect(body.orders[0].folio).toBe("OC-001");
        });

        it("should return empty orders array when none exist", async () => {
            mockSupabase._data = [];
            const req = new NextRequest("http://localhost/api/v1/purchase-orders");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.orders).toHaveLength(0);
        });
    });

    describe("POST /api/v1/purchase-orders", () => {
        it("should create purchase order and return 201", async () => {
            const payload = {
                folio: "OC-2024-00001",
                provider: "Proveedor Cambridge",
                description: "Compra de materiales Cambridge",
                status: "PENDING",
            };
            mockSupabase._data = { id: "po-new", ...payload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/purchase-orders", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.order.folio).toBe("OC-2024-00001");
        });

        it("should generate folio via rpc when folio omitted", async () => {
            const payload = { provider: "P", description: "", status: "PENDING" };
            mockSupabase._data = { id: "po-a", folio: "OC-2026-00001", ...payload, org_id: "org-uuid-001" };
            const req = new NextRequest("http://localhost/api/v1/purchase-orders", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(201);
            expect(mockSupabase.rpc).toHaveBeenCalledWith("fn_next_folio", {
                p_org_id: mockMember.org_id,
                p_doc_type: "PO",
            });
        });

        it("should return 400 when folio format is invalid", async () => {
            const req = new NextRequest("http://localhost/api/v1/purchase-orders", {
                method: "POST",
                body: JSON.stringify({ folio: "OC-bad", provider: "X" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should return 400 when status is invalid", async () => {
            const req = new NextRequest("http://localhost/api/v1/purchase-orders", {
                method: "POST",
                body: JSON.stringify({ folio: "OC-2024-00003", status: "INVALID" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should include created_by and updated_by from user", async () => {
            mockSupabase._data = { id: "po-by", folio: "OC-2026-00005", org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/purchase-orders", {
                method: "POST",
                body: JSON.stringify({ folio: "OC-2026-00005", provider: "P" }),
            });

            await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({ created_by: "u1", updated_by: "u1" })
            );
        });
    });
});
