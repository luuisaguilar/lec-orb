import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/cenni/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

const createMockSupabase = () => {
    const mock: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: mock._data, error: mock._error })),
        _data: null,
        _error: null,
    };
    return mock;
};

describe("CENNI API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/cenni", () => {
        it("should return cenni cases list", async () => {
            mockSupabase._data = [
                { id: "c1", folio_cenni: "C-001", cliente_estudiante: "Juan Pérez", estatus: "EN OFICINA" },
                { id: "c2", folio_cenni: "C-002", cliente_estudiante: "María García", estatus: "SOLICITADO" },
            ];

            const req = new NextRequest("http://localhost/api/v1/cenni");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.cases).toHaveLength(2);
            expect(body.total).toBe(2);
            expect(body.role).toBe("admin");
        });

        it("should return empty cases array when none exist", async () => {
            mockSupabase._data = [];

            const req = new NextRequest("http://localhost/api/v1/cenni");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.cases).toHaveLength(0);
            expect(body.total).toBe(0);
        });
    });

    describe("POST /api/v1/cenni", () => {
        it("should create a cenni case and return 201", async () => {
            const payload = {
                folio_cenni: "CENNI-2024-001",
                cliente_estudiante: "Carlos Ramírez",
                celular: "5512345678",
                correo: "carlos@example.com",
                solicitud_cenni: true,
                acta_o_curp: false,
                id_documento: true,
                estatus: "EN OFICINA",
            };
            mockSupabase._data = { id: "c-new", ...payload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/cenni", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.case).toBeDefined();
            expect(body.case.folio_cenni).toBe("CENNI-2024-001");
            expect(body.case.cliente_estudiante).toBe("Carlos Ramírez");
        });

        it("should return 400 when folio_cenni is missing", async () => {
            const badPayload = { cliente_estudiante: "Test" }; // folio_cenni min(1) falla
            const req = new NextRequest("http://localhost/api/v1/cenni", {
                method: "POST",
                body: JSON.stringify(badPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it("should return 400 when cliente_estudiante is missing", async () => {
            const badPayload = { folio_cenni: "C-001" }; // sin cliente
            const req = new NextRequest("http://localhost/api/v1/cenni", {
                method: "POST",
                body: JSON.stringify(badPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should use Zod default estatus EN OFICINA when not provided in payload", async () => {
            const payload = { folio_cenni: "C-002", cliente_estudiante: "Test" };
            mockSupabase._data = { id: "c-def", ...payload, estatus: "EN OFICINA", org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/cenni", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            // El schema Zod tiene default("EN OFICINA") para estatus
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({ estatus: "EN OFICINA" })
            );
        });
    });
});
