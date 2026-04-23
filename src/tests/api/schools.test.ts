import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/schools/route";

// --- Mocks ---

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

// Desactivar DEMO_MODE para todos los tests de este archivo
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
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: mock._data, error: mock._error })),
        _data: null,
        _error: null,
    };
    return mock;
};

describe("Schools API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    // ------------------------------------------------------------------ GET
    describe("GET /api/v1/schools", () => {
        it("should return schools list for the org", async () => {
            mockSupabase._data = [
                { id: "s1", name: "UNAM Facultad de Idiomas", city: "CDMX", org_id: "org-uuid-001", deleted_at: null },
                { id: "s2", name: "ITESM Campus MTY", city: "Monterrey", org_id: "org-uuid-001", deleted_at: null },
            ];

            const req = new NextRequest("http://localhost/api/v1/schools");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.schools).toHaveLength(2);
            expect(body.total).toBe(2);
            expect(body.schools[0].name).toBe("UNAM Facultad de Idiomas");
        });

        it("should return empty array when no schools exist", async () => {
            mockSupabase._data = null;

            const req = new NextRequest("http://localhost/api/v1/schools");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.schools).toHaveLength(0);
            expect(body.total).toBe(0);
        });
    });

    // ------------------------------------------------------------------ POST
    describe("POST /api/v1/schools", () => {
        it("should create a school and return 201", async () => {
            const schoolPayload = {
                name: "Centro de Idiomas Guadalajara",
                city: "Guadalajara",
                address: "Av. Chapultepec 123",
                contact_name: "María López",
                contact_phone: "3312345678",
                contact_email: "director@cidiomasGDL.mx",
                levels: ["primaria", "secundaria"],
            };
            mockSupabase._data = { id: "s-new", ...schoolPayload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/schools", {
                method: "POST",
                body: JSON.stringify(schoolPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.school).toBeDefined();
            expect(body.school.name).toBe("Centro de Idiomas Guadalajara");
        });

        it("should return 400 when name is empty", async () => {
            const badPayload = { name: "" }; // min(1) falla
            const req = new NextRequest("http://localhost/api/v1/schools", {
                method: "POST",
                body: JSON.stringify(badPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it("should create school with minimal required data (only name)", async () => {
            mockSupabase._data = { id: "s-min", name: "Escuela Mínima", org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/schools", {
                method: "POST",
                body: JSON.stringify({ name: "Escuela Mínima" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.school.name).toBe("Escuela Mínima");
        });

        it("should serialize operating_hours to JSON when provided", async () => {
            const schoolPayload = {
                name: "Escuela con Horarios",
                operating_hours: { open: "08:00", close: "18:00" },
            };
            mockSupabase._data = { id: "s-hours", ...schoolPayload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/schools", {
                method: "POST",
                body: JSON.stringify(schoolPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(response.status).toBe(201);
            // Verifica que insert recibió operating_hours como string
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    operating_hours: JSON.stringify({ open: "08:00", close: "18:00" }),
                })
            );
        });
    });
});
