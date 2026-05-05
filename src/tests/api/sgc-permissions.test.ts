import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getAuthenticatedMember: vi.fn(),
    checkServerPermission: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: mocks.createClient,
}));

vi.mock("@/lib/auth/get-member", () => ({
    getAuthenticatedMember: mocks.getAuthenticatedMember,
}));

vi.mock("@/lib/auth/permissions", () => ({
    checkServerPermission: mocks.checkServerPermission,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

describe("SGC API - granular permissions via member_module_access", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        mocks.createClient.mockResolvedValue({});
    });

    it("denies GET /sgc/nonconformities when granular view permission is false", async () => {
        mocks.getAuthenticatedMember.mockResolvedValue({
            ok: true,
            user: { id: "user-1" },
            member: {
                id: "member-1",
                org_id: "org-1",
                role: "supervisor",
                location: null,
                organizations: { name: "Org Test", slug: "org-test" },
            },
        });
        mocks.checkServerPermission.mockResolvedValue(false);

        const { GET } = await import("@/app/api/v1/sgc/nonconformities/route");
        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities");
        const response = await (GET as any)(req, {});
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Insufficient permissions");
        expect(mocks.checkServerPermission).toHaveBeenCalledWith(
            {},
            "user-1",
            "sgc",
            "view",
        );
    });

    it("denies POST /sgc/actions when granular edit permission is false", async () => {
        mocks.getAuthenticatedMember.mockResolvedValue({
            ok: true,
            user: { id: "user-1" },
            member: {
                id: "member-1",
                org_id: "org-1",
                role: "admin",
                location: null,
                organizations: { name: "Org Test", slug: "org-test" },
            },
        });
        mocks.checkServerPermission.mockResolvedValue(false);

        const { POST } = await import("@/app/api/v1/sgc/actions/route");
        const req = new NextRequest("http://localhost/api/v1/sgc/actions", {
            method: "POST",
            body: JSON.stringify({
                title: "Accion bloqueada por granular",
                type_action: "immediate",
            }),
        });
        const response = await (POST as any)(req, {});
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Insufficient permissions");
        expect(mocks.checkServerPermission).toHaveBeenCalledWith(
            {},
            "user-1",
            "sgc",
            "edit",
        );
    });
});
