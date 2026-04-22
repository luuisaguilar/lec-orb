import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/v1/dashboard/stats/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

// Crea una cadena que resuelve a { count, data } para queries de conteo o data
const makeChain = (result: { data?: any; count?: number } = {}) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) =>
        resolve({ data: result.data ?? null, count: result.count ?? null, error: null })
    ),
});

describe("Dashboard Stats API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/dashboard/stats", () => {
        it("should return all general stats", async () => {
            // Order of from() calls matches Promise.all in the route:
            // 1. applicators (count)  2. schools (count)  3. events (data)
            // 4. event_sessions (data) 5. cenni_cases (count) 6. cenni_cases (status data)
            // 7. applicators (zone data) 8. events (status data) 9. event_sessions (type data)
            const chains = [
                makeChain({ count: 5 }),   // applicators count
                makeChain({ count: 3 }),   // schools count
                makeChain({ data: [{ id: "e1", status: "PUBLISHED", date: new Date().toISOString() }] }), // events
                makeChain({ data: [{ id: "s1", exam_type: "cambridge" }] }), // event_sessions
                makeChain({ count: 10 }),  // cenni_cases count
                makeChain({ data: [{ estatus: "EN OFICINA" }, { estatus: "SOLICITADO" }] }), // cenni by status
                makeChain({ data: [{ location_zone: "CDMX" }, { location_zone: "CDMX" }] }), // applicators by zone
                makeChain({ data: [{ status: "PUBLISHED" }] }), // events by status
                makeChain({ data: [{ exam_type: "toefl" }] }), // exam types
            ];
            let callIndex = 0;
            const mockSupabase = {
                from: vi.fn(() => chains[callIndex++] ?? makeChain()),
            };

            const req = new NextRequest("http://localhost/api/v1/dashboard/stats");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.general.totalApplicators).toBe(5);
            expect(body.general.totalSchools).toBe(3);
            expect(body.general.cenniTotal).toBe(10);
            expect(body.general.totalSessions).toBe(1);
        });

        it("should calculate event counts by status", async () => {
            const chains = [
                makeChain({ count: 0 }),
                makeChain({ count: 0 }),
                makeChain({ data: [] }),
                makeChain({ data: [] }),
                makeChain({ count: 0 }),
                makeChain({ data: [] }),
                makeChain({ data: [] }),
                makeChain({ data: [{ status: "DRAFT" }, { status: "DRAFT" }, { status: "CONFIRMED" }] }),
                makeChain({ data: [] }),
            ];
            let i = 0;
            const mockSupabase = { from: vi.fn(() => chains[i++] ?? makeChain()) };

            const req = new NextRequest("http://localhost/api/v1/dashboard/stats");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(body.events.byStatus.DRAFT).toBe(2);
            expect(body.events.byStatus.CONFIRMED).toBe(1);
        });

        it("should aggregate applicators by zone", async () => {
            const chains = [
                makeChain({ count: 3 }),
                makeChain({ count: 0 }),
                makeChain({ data: [] }),
                makeChain({ data: [] }),
                makeChain({ count: 0 }),
                makeChain({ data: [] }),
                makeChain({ data: [{ location_zone: "CDMX" }, { location_zone: "MTY" }, { location_zone: null }] }),
                makeChain({ data: [] }),
                makeChain({ data: [] }),
            ];
            let i = 0;
            const mockSupabase = { from: vi.fn(() => chains[i++] ?? makeChain()) };

            const req = new NextRequest("http://localhost/api/v1/dashboard/stats");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(body.applicators.byZone["CDMX"]).toBe(1);
            expect(body.applicators.byZone["MTY"]).toBe(1);
            expect(body.applicators.byZone["Sin zona"]).toBe(1);
        });
    });
});
