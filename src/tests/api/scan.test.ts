import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/v1/scan/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/demo/config", () => ({
    DEMO_MODE: false,
    DEMO_USER: { id: "demo-user-001", email: "demo@lec-platform.com", full_name: "Demo Admin" },
    DEMO_ORG: { id: "demo-org-001", name: "LEC Demo", slug: "lec-demo" },
    DEMO_MEMBER: { id: "demo-member-001", org_id: "demo-org-001", user_id: "demo-user-001", role: "admin" },
}));

const makeChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

describe("Scan API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("POST /api/v1/scan (movement)", () => {
        it("should process SALIDA movement via RPC", async () => {
            const packData = { id: "p1", status: "EN_SITIO", codigo: "PACK-001", nombre: "Pack Cambridge" };
            const rpcResult = { success: true, movement_id: "mov-1", previous_status: "EN_SITIO", new_status: "PRESTADO" };

            const packChain = makeChain(packData);
            const mockSupabase = {
                from: vi.fn(() => packChain),
                rpc: vi.fn().mockResolvedValue({ data: rpcResult, error: null }),
            };

            const payload = {
                codigo: "PACK-001",
                type: "SALIDA",
                school_id: "81fbc964-8d7e-4bea-8879-66b516a66a30",
                school_name: "UNAM",
            };

            const req = new NextRequest("http://localhost/api/v1/scan", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.pack.codigo).toBe("PACK-001");
            expect(mockSupabase.rpc).toHaveBeenCalledWith(
                "create_movement_and_update_pack",
                expect.objectContaining({ p_type: "SALIDA" })
            );
        });

        it("should return 404 when pack not found", async () => {
            const mockSupabase = {
                from: vi.fn(() => makeChain(null)),
                rpc: vi.fn(),
            };

            const req = new NextRequest("http://localhost/api/v1/scan", {
                method: "POST",
                body: JSON.stringify({ codigo: "NO-EXISTE", type: "SALIDA" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(404);
            expect(body.error).toContain("not found");
        });

        it("should return 400 when RPC fails", async () => {
            const packData = { id: "p1", status: "EN_SITIO", codigo: "PACK-001", nombre: "Pack" };
            const mockSupabase = {
                from: vi.fn(() => makeChain(packData)),
                rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "Pack estado incorrecto" } }),
            };

            const req = new NextRequest("http://localhost/api/v1/scan", {
                method: "POST",
                body: JSON.stringify({ codigo: "PACK-001", type: "ENTRADA" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it("should return 400 when type is invalid", async () => {
            const mockSupabase = { from: vi.fn(), rpc: vi.fn() };

            const req = new NextRequest("http://localhost/api/v1/scan", {
                method: "POST",
                body: JSON.stringify({ codigo: "PACK-001", type: "INVALIDO" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });
    });

    describe("GET /api/v1/scan (lookup)", () => {
        it("should return pack with recent movements", async () => {
            const packData = { id: "p1", codigo: "PACK-001", status: "EN_SITIO" };
            const movementsData = [
                { id: "mov1", pack_id: "p1", type: "SALIDA", created_at: "2024-01-01" },
            ];

            const packChain = makeChain(packData);
            const movementsChain = makeChain(movementsData);

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => callCount++ === 0 ? packChain : movementsChain),
            };

            const req = new NextRequest("http://localhost/api/v1/scan?codigo=PACK-001");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.pack.codigo).toBe("PACK-001");
            expect(body.movements).toHaveLength(1);
        });

        it("should return 400 when codigo param is missing", async () => {
            const mockSupabase = { from: vi.fn() };
            const req = new NextRequest("http://localhost/api/v1/scan");

            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toContain("Missing codigo");
        });

        it("should return 404 when pack not found", async () => {
            const mockSupabase = { from: vi.fn(() => makeChain(null)) };
            const req = new NextRequest("http://localhost/api/v1/scan?codigo=NO-EXIST");

            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(404);
        });
    });
});
