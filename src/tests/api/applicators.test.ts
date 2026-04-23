import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/applicators/route";

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

describe("Applicators API Route", () => {
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
    describe("GET /api/v1/applicators", () => {
        it("should return applicators list for the org", async () => {
            mockSupabase._data = [
                {
                    id: "a1",
                    name: "Carlos Méndez",
                    email: "carlos@test.com",
                    roles: ["examiner"],
                    authorized_exams: ["cambridge"],
                    org_id: "org-uuid-001",
                    deleted_at: null,
                },
                {
                    id: "a2",
                    name: "Sandra Ruiz",
                    email: "sandra@test.com",
                    roles: ["oral_examiner"],
                    authorized_exams: ["toefl", "cenni"],
                    org_id: "org-uuid-001",
                    deleted_at: null,
                },
            ];

            const req = new NextRequest("http://localhost/api/v1/applicators");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.applicators).toHaveLength(2);
            expect(body.total).toBe(2);
            expect(body.applicators[0].name).toBe("Carlos Méndez");
        });

        it("should return empty array when no applicators exist", async () => {
            mockSupabase._data = null;

            const req = new NextRequest("http://localhost/api/v1/applicators");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.applicators).toHaveLength(0);
            expect(body.total).toBe(0);
        });
    });

    // ------------------------------------------------------------------ POST
    describe("POST /api/v1/applicators", () => {
        it("should create an applicator and return 201", async () => {
            const payload = {
                name: "Jorge Castillo",
                email: "jorge@test.com",
                phone: "5512345678",
                city: "CDMX",
                roles: ["examiner", "oral_examiner"],
                certified_levels: ["b2", "c1"],
                authorized_exams: ["cambridge", "toefl"],
                rate_per_hour: 350,
            };
            mockSupabase._data = { id: "a-new", ...payload, org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/applicators", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.applicator).toBeDefined();
            expect(body.applicator.name).toBe("Jorge Castillo");
        });

        it("should return 400 when name is empty", async () => {
            const badPayload = { name: "" };
            const req = new NextRequest("http://localhost/api/v1/applicators", {
                method: "POST",
                body: JSON.stringify(badPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it("should create applicator with minimal required data (only name)", async () => {
            mockSupabase._data = {
                id: "a-min",
                name: "Aplicador Mínimo",
                roles: [],
                certified_levels: [],
                authorized_exams: [],
                org_id: "org-uuid-001",
            };

            const req = new NextRequest("http://localhost/api/v1/applicators", {
                method: "POST",
                body: JSON.stringify({ name: "Aplicador Mínimo" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.applicator.name).toBe("Aplicador Mínimo");
        });

        it("should include org_id from member when inserting", async () => {
            mockSupabase._data = { id: "a-org", name: "Test", org_id: "org-uuid-001" };

            const req = new NextRequest("http://localhost/api/v1/applicators", {
                method: "POST",
                body: JSON.stringify({ name: "Test" }),
            });

            await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({ org_id: "org-uuid-001" })
            );
        });
    });
});
