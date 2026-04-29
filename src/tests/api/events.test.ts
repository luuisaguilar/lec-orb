import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/events/route";

// --- Mocks ---

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

// Crea cadena encadenable con soporte para los métodos usados en events
const createChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

describe("Events API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    // ------------------------------------------------------------------ GET
    describe("GET /api/v1/events", () => {
        it("should return all events for the org", async () => {
            const eventsData = [
                {
                    id: "evt1",
                    title: "Cambridge B2 Mayo",
                    status: "DRAFT",
                    org_id: "org-uuid-001",
                    school: { name: "UNAM", city: "CDMX" },
                    sessions: [],
                    staff: [],
                },
            ];
            const chain = createChain(eventsData);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/events");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.events).toHaveLength(1);
            expect(body.total).toBe(1);
            expect(body.events[0].title).toBe("Cambridge B2 Mayo");
        });

        it("should filter events by status query param", async () => {
            const eventsData = [{ id: "evt2", title: "FCE Junio", status: "CONFIRMED", sessions: [], staff: [] }];
            const chain = createChain(eventsData);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/events?status=CONFIRMED");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.events[0].status).toBe("CONFIRMED");
            // Verifica que se llamó eq con el status
            expect(chain.eq).toHaveBeenCalledWith("status", "CONFIRMED");
        });

        it("should return empty array when no events exist", async () => {
            const chain = createChain(null);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/events");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.events).toHaveLength(0);
            expect(body.total).toBe(0);
        });
    });

    // ------------------------------------------------------------------ POST
    describe("POST /api/v1/events", () => {
        const validPayload = {
            title: "TOEFL ITP Agosto",
            school_id: "81fbc964-8d7e-4bea-8879-66b516a66a30",
            sessions: [
                {
                    exam_type: "toefl",
                    date: "2024-08-15",
                    parameters: { start_time: "09:00", examiners: 2, break_duration: 15 },
                    classrooms: [{ name: "Aula 1", capacity: 20 }],
                    staff: [],
                },
            ],
        };

        it("should create an event with sessions and return 201", async () => {
            const newEvent = { id: "evt-new", title: "TOEFL ITP Agosto", org_id: "org-uuid-001" };
            const savedSessions = [{ id: "sess-1", event_id: "evt-new", exam_type: "toefl" }];

            const eventsChain = createChain(newEvent);
            const sessionsChain = createChain(savedSessions);

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "events") return eventsChain;
                    if (table === "event_sessions") return sessionsChain;
                    return eventsChain;
                }),
            };

            const req = new NextRequest("http://localhost/api/v1/events", {
                method: "POST",
                body: JSON.stringify(validPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.event).toBeDefined();
            expect(body.event.title).toBe("TOEFL ITP Agosto");
        });

        it("should return 400 when title is too short", async () => {
            const mockSupabase = { from: vi.fn() };
            const badPayload = { ...validPayload, title: "T" }; // min 2 chars
            const req = new NextRequest("http://localhost/api/v1/events", {
                method: "POST",
                body: JSON.stringify(badPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it("should return 400 when sessions array is empty", async () => {
            const mockSupabase = { from: vi.fn() };
            const badPayload = { ...validPayload, sessions: [] };
            const req = new NextRequest("http://localhost/api/v1/events", {
                method: "POST",
                body: JSON.stringify(badPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            await response.json();

            expect(response.status).toBe(400);
        });

        it("should return 400 when session has no classrooms", async () => {
            const mockSupabase = { from: vi.fn() };
            const badPayload = {
                ...validPayload,
                sessions: [{ ...validPayload.sessions[0], classrooms: [] }],
            };
            const req = new NextRequest("http://localhost/api/v1/events", {
                method: "POST",
                body: JSON.stringify(badPayload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            await response.json();

            expect(response.status).toBe(400);
        });

        it("should insert event staff when staff members are provided", async () => {
            const payloadWithStaff = {
                ...validPayload,
                sessions: [
                    {
                        ...validPayload.sessions[0],
                        staff: [{ applicator_id: "app-uuid-001", role: "examiner" }],
                    },
                ],
            };

            const newEvent = { id: "evt-new2", title: "TOEFL ITP Agosto", org_id: "org-uuid-001" };
            const savedSessions = [{ id: "sess-2", event_id: "evt-new2" }];

            const eventsChain = createChain(newEvent);
            const sessionsChain = createChain(savedSessions);
            const staffChain = createChain(null); // staff insert no requiere data

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "events") return eventsChain;
                    if (table === "event_sessions") return sessionsChain;
                    if (table === "event_staff") return staffChain;
                    return eventsChain;
                }),
            };

            const req = new NextRequest("http://localhost/api/v1/events", {
                method: "POST",
                body: JSON.stringify(payloadWithStaff),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(response.status).toBe(201);
            expect(mockSupabase.from).toHaveBeenCalledWith("event_staff");
        });
    });
});
