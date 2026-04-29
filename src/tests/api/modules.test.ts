import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/modules/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

const makeChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

describe("Modules API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/modules", () => {
        it("should return all modules for admin role", async () => {
            const modulesData = [
                { id: "mod1", slug: "events", name: "Eventos", is_native: true, is_active: true },
                { id: "mod2", slug: "finanzas", name: "Finanzas", is_native: false, is_active: true },
            ];
            const mockSupabase = { from: vi.fn(() => makeChain(modulesData)) };

            const req = new NextRequest("http://localhost/api/v1/modules");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.modules).toHaveLength(2);
            expect(body.role).toBe("admin");
        });

        it("should filter modules by permissions for non-admin roles", async () => {
            const nonAdminMember = { ...mockMember, role: "operador" };
            const modulesData = [
                { id: "mod1", slug: "events", name: "Eventos", is_native: true },
                { id: "mod2", slug: "finanzas", name: "Finanzas", is_native: false },
            ];
            const permissionsData = [{ module_id: "mod2", can_view: true }];

            const modulesChain = makeChain(modulesData);
            const permissionsChain = makeChain(permissionsData);

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => callCount++ === 0 ? modulesChain : permissionsChain),
            };

            const req = new NextRequest("http://localhost/api/v1/modules");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: nonAdminMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            // native modules + allowed custom modules
            expect(body.modules).toHaveLength(2); // events (native) + finanzas (permitted)
            expect(body.role).toBe("operador");
        });
    });

    describe("POST /api/v1/modules", () => {
        const validPayload = {
            slug: "mi-modulo",
            name: "Mi Módulo",
            icon: "Star",
            sort_order: 50,
        };

        it("should create module and default permissions when admin", async () => {
            const newModule = { id: "mod-new", ...validPayload, org_id: "org-uuid-001" };
            const moduleChain = makeChain(newModule);
            const permChain = makeChain(null); // permissions insert

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => callCount++ === 0 ? moduleChain : permChain),
            };

            const req = new NextRequest("http://localhost/api/v1/modules", {
                method: "POST",
                body: JSON.stringify(validPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.module.slug).toBe("mi-modulo");
            // debe haber insertado permisos por defecto
            expect(mockSupabase.from).toHaveBeenCalledWith("module_permissions");
        });

        it("should return 403 when non-admin tries to create module", async () => {
            const nonAdminMember = { ...mockMember, role: "supervisor" };
            const mockSupabase = { from: vi.fn() };

            const req = new NextRequest("http://localhost/api/v1/modules", {
                method: "POST",
                body: JSON.stringify(validPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: nonAdminMember });
            await response.json();

            expect(response.status).toBe(403);
        });

        it("should return 400 when slug has invalid characters", async () => {
            const mockSupabase = { from: vi.fn() };
            const req = new NextRequest("http://localhost/api/v1/modules", {
                method: "POST",
                body: JSON.stringify({ ...validPayload, slug: "Mi Modulo Espacios" }), // no cumple /^[a-z0-9-]+$/
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });
    });
});
