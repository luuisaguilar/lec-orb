import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "@/app/api/v1/cenni/route";
import { PATCH, DELETE } from "@/app/api/v1/cenni/[id]/route";
import { POST as POST_BULK } from "@/app/api/v1/cenni/bulk/route";
import { POST as POST_UPLOAD } from "@/app/api/v1/cenni/[id]/certificate-upload/route";
import { GET as GET_CERT_URL } from "@/app/api/v1/cenni/[id]/certificate-url/route";
import { AuthContext } from "@/lib/auth/with-handler";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: unknown) => handler,
}));

vi.mock("@/lib/demo/config", () => ({ DEMO_MODE: false }));

const mockSignedUrl = "https://storage.example.com/signed/cert.pdf";
const mockAdminStorage = {
    from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: mockSignedUrl },
            error: null,
        }),
    }),
};
vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: vi.fn(() => ({ storage: mockAdminStorage })),
}));

interface MockSupabaseResponse {
    data?: unknown;
    error?: unknown;
    count?: number;
}

// ── Queue-based mock ──────────────────────────────────────────────────────────
const createMockSupabase = (responses: MockSupabaseResponse[] = []) => {
    let callCount = 0;
    const storageUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const self = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        storage: {
            from: vi.fn().mockReturnValue({ upload: storageUpload }),
        },
        _storageUpload: storageUpload,
        then: vi.fn((resolve: (value: any) => void) => {
            const resp = responses[callCount++] ?? { data: null, error: null };
            resolve({ data: resp.data ?? null, error: resp.error ?? null, count: resp.count ?? null });
        }),
    } as unknown as AuthContext["supabase"] & { _storageUpload: typeof storageUpload };
    return self;
};

const makePdfFile = () =>
    new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "test.pdf", { type: "application/pdf" });

// ── Shared fixtures ───────────────────────────────────────────────────────────
const MEMBER: AuthContext["member"] = { 
    id: "m1", 
    org_id: "org-001", 
    role: "admin",
    location: null,
    organizations: { name: "Test Org", slug: "test-org" }
};
const USER: AuthContext["user"] = { id: "u1" };
const CASE = { id: "c1", folio_cenni: "C-001", cliente_estudiante: "Juan Pérez", estatus: "EN OFICINA", org_id: "org-001" };
const PARAMS = { params: { id: "c1" } };

type Handler = (req: NextRequest, ctx: AuthContext, nextCtx?: any) => Promise<NextResponse>;

// =============================================================================
describe("CENNI API", () => {

    // ── GET /api/v1/cenni ─────────────────────────────────────────────────────
    describe("GET /api/v1/cenni", () => {
        it("returns cases list with total", async () => {
            const cases = [CASE, { ...CASE, id: "c2", folio_cenni: "C-002" }];
            const supabase = createMockSupabase([{ data: cases, count: 2 }]);
            const req = new NextRequest("http://localhost/api/v1/cenni");
            const res = await (GET as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.cases).toHaveLength(2);
            expect(body.total).toBe(2);
            expect(body.role).toBe("admin");
        });

        it("returns empty list when no cases exist", async () => {
            const supabase = createMockSupabase([{ data: [], count: 0 }]);
            const req = new NextRequest("http://localhost/api/v1/cenni");
            const res = await (GET as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.cases).toHaveLength(0);
            expect(body.total).toBe(0);
        });

        it("passes q param as ilike search to supabase", async () => {
            const supabase = createMockSupabase([{ data: [CASE], count: 1 }]);
            const req = new NextRequest("http://localhost/api/v1/cenni?q=juan");
            await (GET as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });

            expect(supabase.or).toHaveBeenCalledWith(expect.stringContaining("ilike.%juan%"));
        });
    });

    // ── POST /api/v1/cenni ────────────────────────────────────────────────────
    describe("POST /api/v1/cenni", () => {
        it("creates a case and returns 201", async () => {
            const supabase = createMockSupabase([
                { data: CASE },   // insert
                { data: null },   // audit_log
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni", {
                method: "POST",
                body: JSON.stringify({ folio_cenni: "C-001", cliente_estudiante: "Juan Pérez" }),
            });
            const res = await (POST as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });
            const body = await res.json();

            expect(res.status).toBe(201);
            expect(body.case.folio_cenni).toBe("C-001");
        });

        it("defaults estatus to EN OFICINA when not provided", async () => {
            const supabase = createMockSupabase([{ data: CASE }, { data: null }]);
            const req = new NextRequest("http://localhost/api/v1/cenni", {
                method: "POST",
                body: JSON.stringify({ folio_cenni: "C-001", cliente_estudiante: "Juan" }),
            });
            await (POST as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });

            expect(supabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({ estatus: "EN OFICINA" })
            );
        });

        it("returns 400 when folio_cenni is missing", async () => {
            const supabase = createMockSupabase();
            const req = new NextRequest("http://localhost/api/v1/cenni", {
                method: "POST",
                body: JSON.stringify({ cliente_estudiante: "Juan" }),
            });
            const res = await (POST as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });
            expect(res.status).toBe(400);
        });

        it("returns 400 when cliente_estudiante is missing", async () => {
            const supabase = createMockSupabase();
            const req = new NextRequest("http://localhost/api/v1/cenni", {
                method: "POST",
                body: JSON.stringify({ folio_cenni: "C-001" }),
            });
            const res = await (POST as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });
            expect(res.status).toBe(400);
        });
    });

    // ── PATCH /api/v1/cenni/[id] ──────────────────────────────────────────────
    describe("PATCH /api/v1/cenni/[id]", () => {
        it("updates a case and returns 200 with updated data", async () => {
            const updated = { ...CASE, estatus: "SOLICITADO" };
            const supabase = createMockSupabase([
                { data: CASE },    // fetch old case
                { data: updated }, // update
                { data: null },    // audit_log
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1", {
                method: "PATCH",
                body: JSON.stringify({ estatus: "SOLICITADO" }),
            });
            const res = await (PATCH as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.case.estatus).toBe("SOLICITADO");
        });

        it("logs audit with old_data and new_data", async () => {
            const updated = { ...CASE, estatus: "APROBADO" };
            const supabase = createMockSupabase([
                { data: CASE },
                { data: updated },
                { data: null },
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1", {
                method: "PATCH",
                body: JSON.stringify({ estatus: "APROBADO" }),
            });
            const enrichAudit = vi.fn();
            await (PATCH as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit }, PARAMS);

            expect(enrichAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: "UPDATE",
                    old_data: CASE,
                    new_data: updated,
                })
            );
        });

        it("returns 400 when body has no updatable fields", async () => {
            const supabase = createMockSupabase();
            const req = new NextRequest("http://localhost/api/v1/cenni/c1", {
                method: "PATCH",
                body: JSON.stringify({}),
            });
            const res = await (PATCH as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);
            expect(res.status).toBe(400);
        });

        it("returns 400 for invalid estatus value", async () => {
            const supabase = createMockSupabase();
            const req = new NextRequest("http://localhost/api/v1/cenni/c1", {
                method: "PATCH",
                body: JSON.stringify({ estatus: "INVALIDO" }),
            });
            const res = await (PATCH as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);
            expect(res.status).toBe(400);
        });

        it("returns 404 when case is not found", async () => {
            const supabase = createMockSupabase([
                { data: null },                                      // fetch old (not found)
                { data: null, error: { message: "Not found" } },    // update fails
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1", {
                method: "PATCH",
                body: JSON.stringify({ estatus: "SOLICITADO" }),
            });
            const res = await (PATCH as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);
            expect(res.status).toBe(404);
        });
    });

    // ── DELETE /api/v1/cenni/[id] ─────────────────────────────────────────────
    describe("DELETE /api/v1/cenni/[id]", () => {
        it("soft-deletes a case and returns success", async () => {
            const supabase = createMockSupabase([
                { data: CASE },  // fetch old
                { data: null },  // soft-delete update
                { data: null },  // audit_log
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1", { method: "DELETE" });
            const res = await (DELETE as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
        });

        it("sets deleted_at on the update call", async () => {
            const supabase = createMockSupabase([
                { data: CASE },
                { data: null },
                { data: null },
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1", { method: "DELETE" });
            await (DELETE as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);

            expect(supabase.update).toHaveBeenCalledWith(
                expect.objectContaining({ deleted_at: expect.any(String) })
            );
        });

        it("logs audit with action DELETE and null new_data", async () => {
            const supabase = createMockSupabase([
                { data: CASE },
                { data: null },
                { data: null },
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1", { method: "DELETE" });
            const enrichAudit = vi.fn();
            await (DELETE as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit }, PARAMS);

            expect(enrichAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: "DELETE",
                    old_data: CASE,
                    new_data: null,
                })
            );
        });
    });

    // ── POST /api/v1/cenni/bulk ───────────────────────────────────────────────
    describe("POST /api/v1/cenni/bulk", () => {
        const bulkPayload = {
            cases: [
                { folio_cenni: "B-001", cliente_estudiante: "Ana López" },
                { folio_cenni: "B-002", cliente_estudiante: "Luis García" },
            ],
        };

        it("inserts cases and returns count for admin", async () => {
            const supabase = createMockSupabase([{ data: null }]);
            const req = new NextRequest("http://localhost/api/v1/cenni/bulk", {
                method: "POST",
                body: JSON.stringify(bulkPayload),
            });
            const res = await (POST_BULK as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });
            const body = await res.json();

            expect(res.status).toBe(201);
            expect(body.count).toBe(2);
            expect(body.success).toBe(true);
        });

        it("returns 403 for operador role", async () => {
            const supabase = createMockSupabase();
            const operador = { ...MEMBER, role: "operador" };
            const req = new NextRequest("http://localhost/api/v1/cenni/bulk", {
                method: "POST",
                body: JSON.stringify(bulkPayload),
            });
            const res = await (POST_BULK as unknown as Handler)(req, { supabase, user: USER, member: operador, enrichAudit: vi.fn() });
            expect(res.status).toBe(403);
        });

        it("returns 400 for invalid payload", async () => {
            const supabase = createMockSupabase();
            const req = new NextRequest("http://localhost/api/v1/cenni/bulk", {
                method: "POST",
                body: JSON.stringify({ cases: [{ correo: "only-email@example.com" }] }),
            });
            const res = await (POST_BULK as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });
            expect(res.status).toBe(400);
        });

        it("attaches org_id to each case on upsert", async () => {
            const supabase = createMockSupabase([{ data: null }]);
            const req = new NextRequest("http://localhost/api/v1/cenni/bulk", {
                method: "POST",
                body: JSON.stringify(bulkPayload),
            });
            await (POST_BULK as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() });

            expect(supabase.upsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ org_id: MEMBER.org_id }),
                ]),
                expect.objectContaining({ onConflict: "org_id,folio_cenni" })
            );
        });
    });

    // ── POST /api/v1/cenni/[id]/certificate-upload ───────────────────────────
    describe("POST /api/v1/cenni/[id]/certificate-upload", () => {
        const makeUploadReq = (file: File | null) => {
            const form = new FormData();
            if (file) form.append("file", file);
            return new NextRequest("http://localhost/api/v1/cenni/c1/certificate-upload", {
                method: "POST",
                body: form,
            });
        };

        it("uploads PDF and returns updated case", async () => {
            const updated = { ...CASE, certificate_storage_path: "org-001/c1.pdf" };
            const supabase = createMockSupabase([
                { data: { id: "c1" } },  // verify case exists
                { data: updated },        // update certificate_storage_path
                { data: null },           // audit_log
            ]);
            const res = await (POST_UPLOAD as unknown as Handler)(
                makeUploadReq(makePdfFile()),
                { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() },
                PARAMS,
            );
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.case.certificate_storage_path).toBe("org-001/c1.pdf");
            expect(supabase._storageUpload).toHaveBeenCalled();
        });

        it("uses upsert:true so existing certificate is replaced", async () => {
            const supabase = createMockSupabase([
                { data: { id: "c1" } },
                { data: { ...CASE, certificate_storage_path: "org-001/c1.pdf" } },
                { data: null },
            ]);
            await (POST_UPLOAD as unknown as Handler)(
                makeUploadReq(makePdfFile()),
                { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() },
                PARAMS,
            );

            expect(supabase._storageUpload).toHaveBeenCalledWith(
                expect.any(String),
                expect.anything(),
                expect.objectContaining({ upsert: true }),
            );
        });

        it("returns 400 when no file is attached", async () => {
            const supabase = createMockSupabase();
            const res = await (POST_UPLOAD as unknown as Handler)(
                makeUploadReq(null),
                { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() },
                PARAMS,
            );
            expect(res.status).toBe(400);
        });

        it("returns 400 for non-PDF file", async () => {
            const supabase = createMockSupabase();
            const notPdf = new File(["data"], "image.png", { type: "image/png" });
            const res = await (POST_UPLOAD as unknown as Handler)(
                makeUploadReq(notPdf),
                { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() },
                PARAMS,
            );
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error).toMatch(/PDF/i);
        });

        it("returns 404 when case does not belong to org", async () => {
            const supabase = createMockSupabase([
                { data: null, error: { message: "Not found" } },  // case not found
            ]);
            const res = await (POST_UPLOAD as unknown as Handler)(
                makeUploadReq(makePdfFile()),
                { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() },
                PARAMS,
            );
            expect(res.status).toBe(404);
        });
    });

    // ── GET /api/v1/cenni/[id]/certificate-url ───────────────────────────────
    describe("GET /api/v1/cenni/[id]/certificate-url", () => {
        it("returns a signed URL for existing certificate", async () => {
            const supabase = createMockSupabase([
                { data: { certificate_storage_path: "org-001/c1.pdf" } },
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1/certificate-url");
            const res = await (GET_CERT_URL as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.url).toBe(mockSignedUrl);
            expect(body.expiresIn).toBe(300);
        });

        it("returns 404 when case has no certificate uploaded", async () => {
            const supabase = createMockSupabase([
                { data: { certificate_storage_path: null } },
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1/certificate-url");
            const res = await (GET_CERT_URL as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);

            expect(res.status).toBe(404);
        });

        it("returns 404 when case is not found", async () => {
            const supabase = createMockSupabase([
                { data: null, error: { message: "Not found" } },
            ]);
            const req = new NextRequest("http://localhost/api/v1/cenni/c1/certificate-url");
            const res = await (GET_CERT_URL as unknown as Handler)(req, { supabase, user: USER, member: MEMBER, enrichAudit: vi.fn() }, PARAMS);

            expect(res.status).toBe(404);
        });
    });
});
