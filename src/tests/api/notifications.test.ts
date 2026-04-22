import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/v1/notifications/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

const makeChain = (data: any, count: number = 0) => ({
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, count, error: null })),
});

describe("Notifications API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/notifications", () => {
        it("should return notifications with unread count", async () => {
            const notificationsData = [
                { id: "n1", user_id: "u1", is_read: false, message: "Nuevo evento creado" },
                { id: "n2", user_id: "u1", is_read: true, message: "Invitación aceptada" },
            ];

            const mainChain = makeChain(notificationsData, 2);
            const unreadChain = makeChain(null, 1);

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => callCount++ === 0 ? mainChain : unreadChain),
            };

            const req = new NextRequest("http://localhost/api/v1/notifications");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.notifications).toHaveLength(2);
            expect(body.unread_count).toBe(1);
            expect(body.total).toBe(2);
        });

        it("should filter only unread when param provided", async () => {
            const mainChain = makeChain([], 0);
            const unreadChain = makeChain(null, 0);

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => callCount++ === 0 ? mainChain : unreadChain),
            };

            const req = new NextRequest("http://localhost/api/v1/notifications?unread=true");
            await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mainChain.eq).toHaveBeenCalledWith("is_read", false);
        });

        it("should return empty notifications for user with none", async () => {
            const mainChain = makeChain(null, 0);
            const unreadChain = makeChain(null, 0);

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => callCount++ === 0 ? mainChain : unreadChain),
            };

            const req = new NextRequest("http://localhost/api/v1/notifications");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(body.notifications).toHaveLength(0);
            expect(body.unread_count).toBe(0);
        });
    });

    describe("PATCH /api/v1/notifications", () => {
        it("should mark all notifications as read when mark_all is true", async () => {
            const chain = makeChain(null);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/notifications", {
                method: "PATCH",
                body: JSON.stringify({ mark_all: true }),
            });

            const response = await (PATCH as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(chain.update).toHaveBeenCalledWith({ is_read: true });
        });

        it("should mark specific ids as read when ids array provided", async () => {
            const chain = makeChain(null);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/notifications", {
                method: "PATCH",
                body: JSON.stringify({ ids: ["n1", "n2"] }),
            });

            const response = await (PATCH as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(chain.in).toHaveBeenCalledWith("id", ["n1", "n2"]);
        });

        it("should return success without DB call when neither mark_all nor ids provided", async () => {
            const mockSupabase = { from: vi.fn() };

            const req = new NextRequest("http://localhost/api/v1/notifications", {
                method: "PATCH",
                body: JSON.stringify({}),
            });

            const response = await (PATCH as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(mockSupabase.from).not.toHaveBeenCalled();
        });
    });
});
