import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/toefl/codes/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

const createMockSupabase = () => {
    const mock: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: mock._data, error: mock._error })),
        _data: null,
        _error: null,
    };
    return mock;
};

describe("TOEFL Codes API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/toefl/codes", () => {
        it("should return active TOEFL codes for org", async () => {
            mockSupabase._data = [
                { id: "tc1", folio: "TFL-001", test_type: "ITP", status: "AVAILABLE" },
                { id: "tc2", folio: "TFL-002", test_type: "ITP", status: "USED" },
            ];

            const req = new NextRequest("http://localhost/api/v1/toefl/codes");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.codes).toHaveLength(2);
            expect(body.codes[0].folio).toBe("TFL-001");
        });

        it("should filter by org_id and is_active", async () => {
            mockSupabase._data = [];
            const req = new NextRequest("http://localhost/api/v1/toefl/codes");
            await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.eq).toHaveBeenCalledWith("org_id", "org-uuid-001");
            expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
        });
    });

    describe("POST /api/v1/toefl/codes (bulk create)", () => {
        it("should create bulk TOEFL codes and return 201", async () => {
            const quantity = 3;
            const generatedCodes = Array.from({ length: quantity }, (_, i) => ({
                id: `tc-${i + 1}`,
                folio: `TFL-${i + 1}`,
                test_type: "ITP",
                status: "AVAILABLE",
                org_id: "org-uuid-001",
            }));
            mockSupabase._data = generatedCodes;

            const req = new NextRequest("http://localhost/api/v1/toefl/codes", {
                method: "POST",
                body: JSON.stringify({ test_type: "ITP", quantity }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.codes).toHaveLength(3);
            expect(body.message).toContain("3");
        });

        it("should generate unique folios with correct format (TFL-YYYYMMDD-...)", async () => {
            mockSupabase._data = [{ id: "tc-1", folio: "TFL-test" }];

            const req = new NextRequest("http://localhost/api/v1/toefl/codes", {
                method: "POST",
                body: JSON.stringify({ test_type: "ITP", quantity: 1 }),
            });

            await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            const insertCall = mockSupabase.insert.mock.calls[0][0];
            expect(insertCall).toHaveLength(1);
            expect(insertCall[0].folio).toMatch(/^TFL-\d{8}-\d{6}-001$/);
            expect(insertCall[0].system_uniq_id).toMatch(/^LEC-/);
            expect(insertCall[0].status).toBe("AVAILABLE");
        });

        it("should return 400 when quantity is 0", async () => {
            const req = new NextRequest("http://localhost/api/v1/toefl/codes", {
                method: "POST",
                body: JSON.stringify({ test_type: "ITP", quantity: 0 }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should return 400 when quantity exceeds 500", async () => {
            const req = new NextRequest("http://localhost/api/v1/toefl/codes", {
                method: "POST",
                body: JSON.stringify({ test_type: "ITP", quantity: 501 }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should return 400 when test_type is missing", async () => {
            const req = new NextRequest("http://localhost/api/v1/toefl/codes", {
                method: "POST",
                body: JSON.stringify({ quantity: 5 }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });
    });
});
