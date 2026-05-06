import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/v1/portal/magic-link/route";

const signInWithOtp = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => ({
        auth: { signInWithOtp },
    })),
}));

vi.mock("@/lib/env/app-url", () => ({
    getConfiguredAppOrigin: vi.fn(() => "https://app.test"),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

describe("POST /api/v1/portal/magic-link", () => {
    const token = "0123456789abcdef0123456789abcdef";
    const email = "applicator@example.com";

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
        signInWithOtp.mockResolvedValue({ error: null });
    });

    function mockInvitation(row: {
        id: string;
        email: string;
        status: string;
        expires_at: string | null;
    } | null) {
        vi.mocked(createAdminClient).mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(() => Promise.resolve({ data: row, error: row ? null : { message: "none" } })),
                    })),
                })),
            })),
        } as any);
    }

    it("returns 400 for invalid body", async () => {
        mockInvitation(null);
        const req = new Request("http://localhost/api/v1/portal/magic-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "bad", invitationToken: token }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        expect(signInWithOtp).not.toHaveBeenCalled();
    });

    it("sends OTP when invitation is pending and email matches", async () => {
        mockInvitation({
            id: "inv-1",
            email,
            status: "pending",
            expires_at: null,
        });

        const req = new Request("http://localhost/api/v1/portal/magic-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, invitationToken: token }),
        });
        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(createClient).toHaveBeenCalled();
        expect(signInWithOtp).toHaveBeenCalledWith({
            email,
            options: {
                emailRedirectTo: `https://app.test/auth/callback?next=${encodeURIComponent(`/join-portal/${token}`)}`,
            },
        });
    });

    it("does not call signInWithOtp when email does not match invitation", async () => {
        mockInvitation({
            id: "inv-1",
            email: "other@example.com",
            status: "pending",
            expires_at: null,
        });

        const req = new Request("http://localhost/api/v1/portal/magic-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, invitationToken: token }),
        });
        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(signInWithOtp).not.toHaveBeenCalled();
    });

    it("returns generic ok when invitation is not pending", async () => {
        mockInvitation({
            id: "inv-1",
            email,
            status: "accepted",
            expires_at: null,
        });

        const req = new Request("http://localhost/api/v1/portal/magic-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, invitationToken: token }),
        });
        const res = await POST(req);
        expect(signInWithOtp).not.toHaveBeenCalled();
    });
});
