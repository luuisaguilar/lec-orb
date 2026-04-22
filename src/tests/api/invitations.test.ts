import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/invitations/route";

// --- Mocks ---

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

vi.mock("@/lib/env/app-url", () => ({
    resolveAppOrigin: vi.fn(() => "http://localhost:3000"),
}));

vi.mock("@/lib/email/resend", () => ({
    sendInvitationEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

// Helper: crea una cadena de supabase encadenable para una tabla
const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

describe("Invitations API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    // ------------------------------------------------------------------ GET
    describe("GET /api/v1/invitations", () => {
        it("should return invitations list", async () => {
            const invitationsData = [
                { id: "inv1", email: "a@test.com", role: "operador", org_id: "org-uuid-001" },
            ];
            const chain = createChain(invitationsData);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/invitations");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.invitations).toHaveLength(1);
            expect(body.invitations[0].email).toBe("a@test.com");
        });

        it("should return empty array when no invitations exist", async () => {
            const chain = createChain([]);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/invitations");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.invitations).toHaveLength(0);
        });
    });

    // ------------------------------------------------------------------ POST
    describe("POST /api/v1/invitations", () => {
        it("should create invitation and return joinUrl when admin", async () => {
            const invitationData = {
                id: "inv-new",
                token: "tok-abc123",
                email: "nuevo@test.com",
                role: "operador",
                org_id: "org-uuid-001",
            };
            const orgData = { name: "Centro de Idiomas" };

            const invitationsChain = createChain(invitationData);
            const organizationsChain = createChain(orgData);

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "org_invitations") return invitationsChain;
                    if (table === "organizations") return organizationsChain;
                    return invitationsChain;
                }),
            };

            const payload = { email: "nuevo@test.com", role: "operador", sendEmail: true };
            const req = new NextRequest("http://localhost/api/v1/invitations", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.invitation).toBeDefined();
            expect(body.joinUrl).toContain("/join/");
            expect(body.emailSent).toBe(true);
        });

        it("should return 403 when non-admin tries to invite", async () => {
            const nonAdminMember = { ...mockMember, role: "operador" };
            const invitationsChain = createChain({ id: "inv-new", token: "tok" });
            const mockSupabase = { from: vi.fn(() => invitationsChain) };

            const payload = { email: "nuevo@test.com", role: "operador", sendEmail: false };
            const req = new NextRequest("http://localhost/api/v1/invitations", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: nonAdminMember });
            const body = await response.json();

            expect(response.status).toBe(403);
            expect(body.error).toMatch(/Forbidden/i);
        });

        it("should return 400 when email is invalid", async () => {
            const mockSupabase = { from: vi.fn() };
            const payload = { email: "not-an-email", role: "operador" };
            const req = new NextRequest("http://localhost/api/v1/invitations", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it("should return 400 when role is invalid", async () => {
            const mockSupabase = { from: vi.fn() };
            const payload = { email: "valid@test.com", role: "superuser" }; // rol inválido
            const req = new NextRequest("http://localhost/api/v1/invitations", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
        });

        it("should still succeed and return joinUrl even when email fails to send", async () => {
            const { sendInvitationEmail } = await import("@/lib/email/resend");
            vi.mocked(sendInvitationEmail).mockResolvedValueOnce({ sent: false });

            const invitationData = { id: "inv-new", token: "tok-abc", email: "x@test.com", role: "admin" };
            const orgData = { name: "LEC" };
            const invitationsChain = createChain(invitationData);
            const organizationsChain = createChain(orgData);

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "org_invitations") return invitationsChain;
                    if (table === "organizations") return organizationsChain;
                    return invitationsChain;
                }),
            };

            const payload = { email: "x@test.com", role: "admin", sendEmail: true };
            const req = new NextRequest("http://localhost/api/v1/invitations", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.joinUrl).toContain("/join/");
            expect(body.emailSent).toBe(false);
            expect(body.emailError).toBeDefined();
        });
    });
});
