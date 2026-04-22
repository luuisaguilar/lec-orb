import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, DELETE } from "@/app/api/v1/users/route";

// --- Mocks ---

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

// Helper: crea cadena encadenable para una tabla
const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

describe("Users API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    // ------------------------------------------------------------------ GET
    describe("GET /api/v1/users", () => {
        it("should return formatted members with names and emails", async () => {
            const membersData = [
                { id: "m1", user_id: "u1", role: "admin", created_at: "2024-01-01", location: null, job_title: null },
                { id: "m2", user_id: "u2", role: "operador", created_at: "2024-01-02", location: "CDMX", job_title: null },
            ];
            const profilesData = [
                { id: "u1", full_name: "Luis Aguilar" },
                { id: "u2", full_name: "Ana Torres" },
            ];
            const emailsData = [
                { id: "u1", email: "luis@test.com" },
                { id: "u2", email: "ana@test.com" },
            ];

            const membersChain = createChain(membersData);
            const profilesChain = createChain(profilesData);

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "org_members") return membersChain;
                    if (table === "profiles") return profilesChain;
                    return membersChain;
                }),
                rpc: vi.fn().mockResolvedValue({ data: emailsData, error: null }),
            };

            const req = new NextRequest("http://localhost/api/v1/users");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.members).toHaveLength(2);
            expect(body.members[0].full_name).toBe("Luis Aguilar");
            expect(body.members[0].email).toBe("luis@test.com");
            expect(body.members[1].full_name).toBe("Ana Torres");
        });

        it("should fallback to 'Sin nombre' and 'Sin correo' when profile or email is missing", async () => {
            const membersData = [
                { id: "m3", user_id: "u3", role: "supervisor", created_at: "2024-01-03", location: null, job_title: null },
            ];

            const membersChain = createChain(membersData);
            const profilesChain = createChain([]); // sin perfil

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "org_members") return membersChain;
                    if (table === "profiles") return profilesChain;
                    return membersChain;
                }),
                rpc: vi.fn().mockResolvedValue({ data: [], error: null }), // sin emails
            };

            const req = new NextRequest("http://localhost/api/v1/users");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.members[0].full_name).toBe("Sin nombre");
            expect(body.members[0].email).toBe("Sin correo");
        });

        it("should return empty members array when org has no members", async () => {
            const membersChain = createChain([]);
            const profilesChain = createChain([]);

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "org_members") return membersChain;
                    if (table === "profiles") return profilesChain;
                    return membersChain;
                }),
                rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
            };

            const req = new NextRequest("http://localhost/api/v1/users");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.members).toHaveLength(0);
        });
    });

    // ---------------------------------------------------------------- DELETE
    describe("DELETE /api/v1/users", () => {
        it("should delete a member by id", async () => {
            const deleteChain = createChain(null);
            const mockSupabase = { from: vi.fn(() => deleteChain) };

            const req = new NextRequest("http://localhost/api/v1/users?id=m1", {
                method: "DELETE",
            });

            const response = await (DELETE as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
        });

        it("should return 400 when id param is missing", async () => {
            const mockSupabase = { from: vi.fn() };
            const req = new NextRequest("http://localhost/api/v1/users", {
                method: "DELETE",
            });

            const response = await (DELETE as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toMatch(/Missing ID/i);
        });
    });
});
