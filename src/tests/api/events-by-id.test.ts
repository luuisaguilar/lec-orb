import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/v1/events/[id]/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

type QueryResult = { data: any; error: any };

function createThenableQuery(resolveResult: (filters: Record<string, any>) => QueryResult) {
    const filters: Record<string, any> = {};
    const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((column: string, value: any) => {
            filters[column] = value;
            return query;
        }),
        maybeSingle: vi.fn(async () => resolveResult(filters)),
        then: (onFulfilled: (value: QueryResult) => any, onRejected?: (reason: any) => any) =>
            Promise.resolve(resolveResult(filters)).then(onFulfilled, onRejected),
    };
    return query;
}

describe("Events by ID API Route", () => {
    const mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
    const mockUser = { id: "u1" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("resolves event by session id fallback and returns 200", async () => {
        const eventId = "event-1";
        const sessionId = "session-1";

        let eventsLookupCount = 0;

        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "events") {
                    return createThenableQuery((filters) => {
                        eventsLookupCount += 1;
                        // First lookup by id=sessionId should not find event
                        if (eventsLookupCount === 1) {
                            expect(filters.id).toBe(sessionId);
                            return { data: null, error: null };
                        }
                        // Second lookup by resolved event_id should return event
                        expect(filters.id).toBe(eventId);
                        expect(filters.org_id).toBe(mockMember.org_id);
                        return {
                            data: { id: eventId, title: "Evento de prueba", school_id: "school-1" },
                            error: null,
                        };
                    });
                }
                if (table === "event_sessions") {
                    return createThenableQuery((filters) => {
                        if (filters.id) {
                            // session fallback lookup
                            return { data: { event_id: eventId }, error: null };
                        }
                        // sessions list by event_id
                        return { data: [{ id: "s-1", event_id: eventId, exam_type: "pet" }], error: null };
                    });
                }
                if (table === "schools") {
                    return createThenableQuery(() => ({
                        data: { id: "school-1", name: "LEC School" },
                        error: null,
                    }));
                }
                if (table === "event_staff") {
                    return createThenableQuery(() => ({ data: [], error: null }));
                }
                if (table === "event_slots") {
                    return createThenableQuery(() => ({ data: [], error: null }));
                }
                return createThenableQuery(() => ({ data: null, error: null }));
            }),
        };

        const req = new NextRequest(`http://localhost/api/v1/events/${sessionId}`);
        const response = await (GET as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: sessionId }) }
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.event).toBeDefined();
        expect(body.event.id).toBe(eventId);
        expect(body.event.sessions).toHaveLength(1);
    });

    it("returns 404 when event id and session id do not exist", async () => {
        const unknownId = "missing-id";

        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "events") {
                    return createThenableQuery(() => ({ data: null, error: null }));
                }
                if (table === "event_sessions") {
                    return createThenableQuery(() => ({ data: null, error: null }));
                }
                return createThenableQuery(() => ({ data: null, error: null }));
            }),
        };

        const req = new NextRequest(`http://localhost/api/v1/events/${unknownId}`);
        const response = await (GET as any)(
            req,
            { supabase: mockSupabase, user: mockUser, member: mockMember },
            { params: Promise.resolve({ id: unknownId }) }
        );
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.error).toBe("Event not found");
    });
});
