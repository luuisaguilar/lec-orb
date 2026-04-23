import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/v1/documents/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

const makeChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => resolve({ data, error })),
});

const makeStorage = (uploadError: any = null) => ({
    from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: uploadError }),
        remove: vi.fn().mockResolvedValue({ error: null }),
    })),
});

describe("Documents API Route", () => {
    let mockMember: any;
    let mockUser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { id: "m1", org_id: "org-uuid-001", role: "admin" };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/documents", () => {
        it("should return documents list", async () => {
            const docsData = [
                { id: "d1", file_name: "contrato.pdf", module_slug: "cenni", org_id: "org-uuid-001" },
            ];
            const chain = makeChain(docsData);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/documents");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.documents).toHaveLength(1);
        });

        it("should filter by module_slug when provided", async () => {
            const chain = makeChain([]);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/documents?module=cenni");
            await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(chain.eq).toHaveBeenCalledWith("module_slug", "cenni");
        });

        it("should filter by record_id when provided", async () => {
            const chain = makeChain([]);
            const mockSupabase = { from: vi.fn(() => chain) };

            const req = new NextRequest("http://localhost/api/v1/documents?record_id=rec-001");
            await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });

            expect(chain.eq).toHaveBeenCalledWith("record_id", "rec-001");
        });

        it("should return empty array when null response", async () => {
            const mockSupabase = { from: vi.fn(() => makeChain(null)) };

            const req = new NextRequest("http://localhost/api/v1/documents");
            const response = await (GET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(body.documents).toHaveLength(0);
        });
    });

    describe("POST /api/v1/documents", () => {
        it("should upload file and create document record", async () => {
            const docData = { id: "d-new", file_name: "test.pdf", org_id: "org-uuid-001" };
            const profileChain = makeChain({ full_name: "Luis Aguilar" });
            const docChain = makeChain(docData);

            const mockSupabase = {
                from: vi.fn((table: string) =>
                    table === "profiles" ? profileChain : docChain
                ),
                storage: makeStorage(),
            };

            const formData = new FormData();
            formData.append("file", new File(["pdf content"], "test.pdf", { type: "application/pdf" }));
            formData.append("module_slug", "cenni");
            formData.append("record_id", "rec-001");

            const req = new NextRequest("http://localhost/api/v1/documents", {
                method: "POST",
                body: formData,
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body.document).toBeDefined();
        });

        it("should return 400 when file is missing", async () => {
            const mockSupabase = { from: vi.fn(), storage: makeStorage() };

            const formData = new FormData();
            formData.append("module_slug", "cenni"); // sin file

            const req = new NextRequest("http://localhost/api/v1/documents", {
                method: "POST",
                body: formData,
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toContain("file and module_slug are required");
        });

        it("should return 400 when module_slug is missing", async () => {
            const mockSupabase = { from: vi.fn(), storage: makeStorage() };

            const formData = new FormData();
            formData.append("file", new File(["x"], "x.pdf"));
            // sin module_slug

            const req = new NextRequest("http://localhost/api/v1/documents", {
                method: "POST",
                body: formData,
            });

            const response = await (POST as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            expect(response.status).toBe(400);
        });
    });

    describe("DELETE /api/v1/documents", () => {
        it("should delete document and storage file", async () => {
            const docData = { file_path: "org-uuid-001/cenni/rec-001/123.pdf" };
            const docChain = makeChain(docData);
            const deleteChain = makeChain(null);

            let callCount = 0;
            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "documents" && callCount++ === 0) return docChain;
                    return deleteChain;
                }),
                storage: makeStorage(),
            };

            const req = new NextRequest("http://localhost/api/v1/documents?id=d1", {
                method: "DELETE",
            });

            const response = await (DELETE as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
        });

        it("should return 400 when id is missing", async () => {
            const mockSupabase = { from: vi.fn() };
            const req = new NextRequest("http://localhost/api/v1/documents", {
                method: "DELETE",
            });

            const response = await (DELETE as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(400);
            expect(body.error).toContain("id is required");
        });

        it("should return 404 when document not found", async () => {
            const mockSupabase = { from: vi.fn(() => makeChain(null)) };
            const req = new NextRequest("http://localhost/api/v1/documents?id=not-exist", {
                method: "DELETE",
            });

            const response = await (DELETE as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
            const body = await response.json();

            expect(response.status).toBe(404);
        });
    });
});
