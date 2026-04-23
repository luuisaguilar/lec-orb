import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/suppliers/route";

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

describe("Suppliers API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/suppliers", () => {
        it("should return active suppliers list", async () => {
            mockSupabase._data = [
                { id: "s1", name: "Cambridge University Press", category: "editorial", is_active: true },
                { id: "s2", name: "ETS México", category: "examinadora", is_active: true },
            ];

            const req = new NextRequest("http://localhost/api/v1/suppliers");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.suppliers).toHaveLength(2);
            expect(body.suppliers[0].name).toBe("Cambridge University Press");
        });

        it("should only return active suppliers", async () => {
            mockSupabase._data = [];
            const req = new NextRequest("http://localhost/api/v1/suppliers");
            await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
        });

        it("should return empty array when no active suppliers", async () => {
            mockSupabase._data = null;
            const req = new NextRequest("http://localhost/api/v1/suppliers");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(body.suppliers).toHaveLength(0);
        });
    });

    describe("POST /api/v1/suppliers", () => {
        it("should create supplier and return 201", async () => {
            const payload = {
                name: "ETS Global",
                contact: "Ana Martínez",
                email: "ana@ets.com",
                phone: "5512345678",
                category: "examinadora",
                website: "https://ets.org",
            };
            mockSupabase._data = { id: "sup-new", ...payload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/suppliers", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.supplier.name).toBe("ETS Global");
        });

        it("should return 400 when name is empty", async () => {
            const req = new NextRequest("http://localhost/api/v1/suppliers", {
                method: "POST",
                body: JSON.stringify({ name: "" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should return 400 when email format is invalid", async () => {
            const req = new NextRequest("http://localhost/api/v1/suppliers", {
                method: "POST",
                body: JSON.stringify({ name: "Test", email: "not-an-email" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should accept empty string as email", async () => {
            mockSupabase._data = { id: "sup-e", name: "Sin email", email: "", org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/suppliers", {
                method: "POST",
                body: JSON.stringify({ name: "Sin email", email: "" }), // literal("") permitido
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(201);
        });
    });
});
