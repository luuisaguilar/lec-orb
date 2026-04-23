import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/packs/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/demo/config", () => ({
    DEMO_MODE: false,
    DEMO_USER: { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
    DEMO_ORG: { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
    DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));

const createMockSupabase = () => {
    const mock: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: mock._data, error: mock._error, count: mock._count })),
        _data: null,
        _error: null,
        _count: 0,
    };
    return mock;
};

describe("Packs API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/packs", () => {
        it("should return packs list with pagination", async () => {
            mockSupabase._data = [
                { id: "p1", codigo: "PACK-001", nombre: "Pack Cambridge", status: "EN_SITIO" },
                { id: "p2", codigo: "PACK-002", nombre: "Pack TOEFL", status: "PRESTADO" },
            ];
            mockSupabase._count = 2;

            const req = new NextRequest("http://localhost/api/v1/packs");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.packs).toHaveLength(2);
            expect(body.total).toBe(2);
            expect(body.page).toBe(1);
            expect(body.limit).toBe(50);
        });

        it("should filter by status when provided", async () => {
            mockSupabase._data = [{ id: "p1", codigo: "PACK-001", status: "PRESTADO" }];
            mockSupabase._count = 1;

            const req = new NextRequest("http://localhost/api/v1/packs?status=PRESTADO");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(body.packs[0].status).toBe("PRESTADO");
            expect(mockSupabase.eq).toHaveBeenCalledWith("status", "PRESTADO");
        });

        it("should apply search filter when provided", async () => {
            mockSupabase._data = [];
            mockSupabase._count = 0;

            const req = new NextRequest("http://localhost/api/v1/packs?search=cambridge");
            await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.or).toHaveBeenCalledWith("codigo.ilike.%cambridge%,nombre.ilike.%cambridge%");
        });
    });

    describe("POST /api/v1/packs", () => {
        it("should create pack and return 201", async () => {
            const payload = { codigo: "PACK-NEW", nombre: "Nuevo Pack", status: "EN_SITIO" };
            mockSupabase._data = { id: "p-new", ...payload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/packs", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.pack.codigo).toBe("PACK-NEW");
        });

        it("should return 409 when pack code already exists (DB constraint)", async () => {
            mockSupabase._error = { code: "23505", message: "duplicate key" };

            const req = new NextRequest("http://localhost/api/v1/packs", {
                method: "POST",
                body: JSON.stringify({ codigo: "PACK-DUP" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(409);
            expect(body.error).toContain("already exists");
        });

        it("should return 400 when codigo is empty", async () => {
            const req = new NextRequest("http://localhost/api/v1/packs", {
                method: "POST",
                body: JSON.stringify({ codigo: "" }), // min(1).trim() falla
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });
    });
});
