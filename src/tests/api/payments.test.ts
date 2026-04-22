import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/v1/payments/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

const makeChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

describe("Payments API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin", location: "CDMX" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/payments", () => {
        it("should return active payments", async () => {
            const paymentsData = [
                { id: "pay1", folio: "F-001", amount: 500, status: "PAID", payment_concepts: { concept_key: "toefl", description: "TOEFL ITP" } },
            ];
            const mockSupabase = { from: vi.fn(() => makeChain(paymentsData)) };

            const req = new NextRequest("http://localhost/api/v1/payments");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.payments).toHaveLength(1);
            expect(body.payments[0].folio).toBe("F-001");
        });
    });

    describe("POST /api/v1/payments", () => {
        const basePayload = {
            folio: "F-2024-001",
            first_name: "Juan",
            last_name: "Pérez",
            amount: 1500,
            payment_method: "efectivo",
        };

        it("should create exam payment recalculating amount from concept", async () => {
            const conceptData = { cost: 800 };
            const paymentData = { id: "pay-new", folio: "F-2024-001", amount: 800 };

            const conceptChain = makeChain(conceptData);
            const paymentChain = makeChain(paymentData);

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => callCount++ === 0 ? conceptChain : paymentChain),
            };

            const payload = {
                ...basePayload,
                mode: "exam",
                concept_id: "81fbc964-8d7e-4bea-8879-66b516a66a30",
                quantity: 1,
                discount: 0,
            };

            const req = new NextRequest("http://localhost/api/v1/payments", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.payment).toBeDefined();
            // amount recalculado desde el concept
            expect(mockSupabase.from).toHaveBeenCalledWith("payment_concepts");
        });

        it("should create other-mode payment with custom concept", async () => {
            const paymentData = { id: "pay-other", folio: "F-2024-002", amount: 300 };
            const mockSupabase = { from: vi.fn(() => makeChain(paymentData)) };

            const payload = {
                ...basePayload,
                mode: "other",
                custom_concept: "Multa por retraso",
                quantity: 1,
                discount: 0,
            };

            const req = new NextRequest("http://localhost/api/v1/payments", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(201);
        });

        it("should return 400 when exam mode has no concept_id", async () => {
            const mockSupabase = { from: vi.fn() };
            const payload = {
                ...basePayload,
                mode: "exam",
                // sin concept_id — falla el .refine
                quantity: 1,
                discount: 0,
            };

            const req = new NextRequest("http://localhost/api/v1/payments", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should return 400 when other mode has no custom_concept", async () => {
            const mockSupabase = { from: vi.fn() };
            const payload = {
                ...basePayload,
                mode: "other",
                // sin custom_concept — falla el .refine
                quantity: 1,
                discount: 0,
            };

            const req = new NextRequest("http://localhost/api/v1/payments", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });

        it("should return 400 when email is invalid format", async () => {
            const mockSupabase = { from: vi.fn() };
            const payload = {
                ...basePayload,
                mode: "other",
                custom_concept: "Pago",
                email: "not-valid-email", // no es email ni literal("")
                quantity: 1,
                discount: 0,
            };

            const req = new NextRequest("http://localhost/api/v1/payments", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });
    });
});
