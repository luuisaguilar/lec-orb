import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/toefl/administrations/route";

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
        single: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: mock._data, error: mock._error })),
        _data: null,
        _error: null,
    };
    return mock;
};

describe("TOEFL Administrations API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/toefl/administrations", () => {
        it("should return administrations with start_date mapped from test_date", async () => {
            mockSupabase._data = [
                { id: "a1", name: "TOEFL ITP Feb 2024", test_date: "2024-02-15", end_date: "2024-02-28", is_active: true },
                { id: "a2", name: "TOEFL ITP Mar 2024", test_date: "2024-03-10", end_date: "2024-03-23", is_active: true },
            ];

            const req = new NextRequest("http://localhost/api/v1/toefl/administrations");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.administrations).toHaveLength(2);
            // Verifica que test_date se mapea a start_date
            expect(body.administrations[0].start_date).toBe("2024-02-15");
            expect(body.administrations[0].test_date).toBe("2024-02-15");
        });

        it("should return empty array when no administrations exist", async () => {
            mockSupabase._data = [];
            const req = new NextRequest("http://localhost/api/v1/toefl/administrations");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(body.administrations).toHaveLength(0);
        });
    });

    describe("POST /api/v1/toefl/administrations", () => {
        it("should create administration and return 201", async () => {
            const payload = {
                name: "TOEFL ITP Junio 2024",
                start_date: "2024-06-01",
                end_date: "2024-06-30",
            };
            mockSupabase._data = {
                id: "a-new",
                name: payload.name,
                test_date: payload.start_date,
                end_date: payload.end_date,
                test_type: "N/A",
            };

            const req = new NextRequest("http://localhost/api/v1/toefl/administrations", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.administration.name).toBe("TOEFL ITP Junio 2024");
        });

        it("should store start_date as test_date in DB", async () => {
            mockSupabase._data = { id: "a-date", name: "Test", test_date: "2024-07-01" };

            const req = new NextRequest("http://localhost/api/v1/toefl/administrations", {
                method: "POST",
                body: JSON.stringify({ name: "Test", start_date: "2024-07-01", end_date: "2024-07-31" }),
            });

            await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({ test_date: "2024-07-01", test_type: "N/A" })
            );
        });

        it("should return 400 when name is missing", async () => {
            const req = new NextRequest("http://localhost/api/v1/toefl/administrations", {
                method: "POST",
                body: JSON.stringify({ start_date: "2024-06-01", end_date: "2024-06-30" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });
    });
});
