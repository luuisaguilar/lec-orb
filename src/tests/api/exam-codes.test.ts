import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/exam-codes/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

const createMockSupabase = () => {
    const mock: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: mock._data, error: mock._error })),
        _data: null,
        _error: null,
    };
    return mock;
};

describe("Exam Codes API Route", () => {
    let mockSupabase: any;
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = createMockSupabase();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/exam-codes", () => {
        it("should return active exam codes", async () => {
            mockSupabase._data = [
                { id: "ec1", exam_type: "cambridge", code: "CAM-001", status: "AVAILABLE" },
                { id: "ec2", exam_type: "toefl", code: "TFL-001", status: "USED" },
            ];

            const req = new NextRequest("http://localhost/api/v1/exam-codes");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.codes).toHaveLength(2);
            expect(body.codes[0].code).toBe("CAM-001");
        });

        it("should query only active codes", async () => {
            mockSupabase._data = [];
            const req = new NextRequest("http://localhost/api/v1/exam-codes");
            await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
        });
    });

    describe("POST /api/v1/exam-codes", () => {
        it("should create exam code and return 201", async () => {
            const payload = {
                exam_type: "cambridge",
                code: "CAM-2024-001",
                status: "AVAILABLE",
                registration_date: "2024-01-01",
                expiration_date: "2025-01-01",
            };
            mockSupabase._data = { id: "ec-new", ...payload };

            const req = new NextRequest("http://localhost/api/v1/exam-codes", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.code.code).toBe("CAM-2024-001");
        });

        it("should return 400 when exam_type is missing", async () => {
            const req = new NextRequest("http://localhost/api/v1/exam-codes", {
                method: "POST",
                body: JSON.stringify({ code: "X-001" }), // sin exam_type
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should return 400 when status is invalid", async () => {
            const req = new NextRequest("http://localhost/api/v1/exam-codes", {
                method: "POST",
                body: JSON.stringify({ exam_type: "cambridge", code: "C-001", status: "INVALID" }),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should default status to AVAILABLE when not provided", async () => {
            mockSupabase._data = { id: "ec-def", exam_type: "cenni", code: "C-001", status: "AVAILABLE" };

            const req = new NextRequest("http://localhost/api/v1/exam-codes", {
                method: "POST",
                body: JSON.stringify({ exam_type: "cenni", code: "C-001" }),
            });

            await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({ status: "AVAILABLE" })
            );
        });
    });
});
