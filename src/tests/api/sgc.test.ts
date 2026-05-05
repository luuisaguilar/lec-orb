import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as GET_NC, POST as POST_NC } from "@/app/api/v1/sgc/nonconformities/route";
import { PATCH as PATCH_NC, DELETE as DELETE_NC } from "@/app/api/v1/sgc/nonconformities/[id]/route";
import { GET as GET_NC_BY_ID } from "@/app/api/v1/sgc/nonconformities/[id]/route";
import { POST as POST_ACTION } from "@/app/api/v1/sgc/actions/route";
import { PATCH as PATCH_ACTION } from "@/app/api/v1/sgc/actions/[id]/route";
import { GET as GET_AUDIT } from "@/app/api/v1/sgc/audit/route";
import { PATCH as PATCH_AUDIT } from "@/app/api/v1/sgc/audit/[id]/route";
import { PATCH as PATCH_AUDIT_CAR } from "@/app/api/v1/sgc/audit/cars/[id]/route";
import { GET as GET_STAGES } from "@/app/api/v1/sgc/catalogs/stages/route";
import { POST as POST_STAGES } from "@/app/api/v1/sgc/catalogs/stages/route";
import { POST as POST_SEVERITIES } from "@/app/api/v1/sgc/catalogs/severities/route";
import { GET as GET_ORIGINS, POST as POST_ORIGINS } from "@/app/api/v1/sgc/catalogs/origins/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: unknown) => handler,
}));

const logAuditMock = vi.fn();
vi.mock("@/lib/audit/log", () => ({
    logAudit: (...args: unknown[]) => logAuditMock(...args),
}));

interface AuthContext {
    supabase: any;
    user: { id: string; email?: string };
    member: {
        id: string;
        org_id: string;
        role: string;
        location: string | null;
        organizations: { name: string; slug: string } | null;
    };
    enrichAudit: (entry: unknown) => void;
}

interface MockSupabaseResponse {
    data?: unknown;
    error?: { code?: string; message?: string } | null;
    count?: number | null;
}

const createMockSupabase = (responses: MockSupabaseResponse[] = []) => {
    let callCount = 0;
    const self: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: (value: any) => void) => {
            const response = responses[callCount++] ?? { data: null, error: null, count: null };
            resolve({
                data: response.data ?? null,
                error: response.error ?? null,
                count: response.count ?? null,
            });
        }),
    };

    return self as AuthContext["supabase"];
};

const MEMBER_ADMIN: AuthContext["member"] = {
    id: "m-admin",
    org_id: "org-001",
    role: "admin",
    location: null,
    organizations: { name: "Test Org", slug: "test-org" },
};

const MEMBER_OPERADOR: AuthContext["member"] = {
    ...MEMBER_ADMIN,
    role: "operador",
};

const USER: AuthContext["user"] = { id: "user-001" };

type Handler = (req: NextRequest, ctx: AuthContext, nextCtx?: any) => Promise<NextResponse>;

describe("SGC API Sprint 01", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("GET /sgc/nonconformities returns paginated list and respects org_id", async () => {
        const supabase = createMockSupabase([{ data: [{ id: "nc-1" }], count: 1 }]);
        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities?page=1&limit=20");

        const response = await (GET_NC as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.nonconformities).toHaveLength(1);
        expect(body.pagination.total).toBe(1);
        expect(supabase.eq).toHaveBeenCalledWith("org_id", MEMBER_ADMIN.org_id);
    });

    it("POST /sgc/nonconformities returns 403 for operador", async () => {
        const supabase = createMockSupabase();
        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities", {
            method: "POST",
            body: JSON.stringify({ description: "Descripcion NC" }),
        });

        const response = await (POST_NC as unknown as Handler)(req, {
            supabase,
            member: MEMBER_OPERADOR,
            user: USER,
            enrichAudit: vi.fn(),
        });

        expect(response.status).toBe(403);
    });

    it("POST /sgc/nonconformities creates a record and logs audit", async () => {
        const created = { id: "nc-1", org_id: MEMBER_ADMIN.org_id, description: "Nueva NC" };
        const supabase = createMockSupabase([{ data: created }]);
        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities", {
            method: "POST",
            body: JSON.stringify({ description: "Nueva NC" }),
        });

        const response = await (POST_NC as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.nonconformity.id).toBe("nc-1");
        expect(logAuditMock).toHaveBeenCalled();
    });

    it("POST /sgc/nonconformities creates relation rows for origins/causes/actions", async () => {
        const created = { id: "nc-2", org_id: MEMBER_ADMIN.org_id, description: "NC con relaciones" };
        const originId = "81fbc964-8d7e-4bea-8879-66b516a66a30";
        const causeId = "8cfbc964-8d7e-4bea-8879-66b516a66a31";
        const actionId = "9dfbc964-8d7e-4bea-8879-66b516a66a32";
        const supabase = createMockSupabase([
            { data: [{ id: originId }] }, // validate origins
            { data: [{ id: causeId }] }, // validate causes
            { data: [{ id: actionId }] }, // validate actions
            { data: created }, // create nc
            { data: [{ id: "rel-origin-1" }] }, // insert origin links
            { data: [{ id: "rel-cause-1" }] }, // insert cause links
            { data: [{ id: "rel-action-1" }] }, // insert action links
        ]);

        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities", {
            method: "POST",
            body: JSON.stringify({
                description: "NC con relaciones",
                origin_ids: [originId],
                cause_ids: [causeId],
                action_links: [{
                    action_id: actionId,
                    relation_type: "immediate",
                }],
            }),
        });

        const response = await (POST_NC as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });

        expect(response.status).toBe(201);
        expect(supabase.from).toHaveBeenCalledWith("sgc_nonconformity_origins");
        expect(supabase.from).toHaveBeenCalledWith("sgc_nonconformity_causes");
        expect(supabase.from).toHaveBeenCalledWith("sgc_nonconformity_actions");
    });

    it("GET /sgc/nonconformities/[id] returns linked origin_ids/cause_ids/action_links", async () => {
        const supabase = createMockSupabase([
            { data: { id: "nc-1", description: "Detalle NC", org_id: MEMBER_ADMIN.org_id } }, // nc
            { data: [{ origin_id: "o-1" }] }, // origins
            { data: [{ cause_id: "c-1" }] }, // causes
            { data: [{ action_id: "a-1", relation_type: "planned" }] }, // actions
        ]);
        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities/nc-1");

        const response = await (GET_NC_BY_ID as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        }, { params: { id: "nc-1" } });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.nonconformity.origin_ids).toEqual(["o-1"]);
        expect(body.nonconformity.cause_ids).toEqual(["c-1"]);
        expect(body.nonconformity.action_links).toEqual([{ action_id: "a-1", relation_type: "planned" }]);
    });

    it("PATCH /sgc/nonconformities/[id] updates NC relations", async () => {
        const originId = "71fbc964-8d7e-4bea-8879-66b516a66a33";
        const causeId = "61fbc964-8d7e-4bea-8879-66b516a66a34";
        const actionId = "51fbc964-8d7e-4bea-8879-66b516a66a35";
        const supabase = createMockSupabase([
            { data: { id: "nc-1", org_id: MEMBER_ADMIN.org_id, description: "Prev" } }, // existing
            { data: [{ id: originId }] }, // validate origins
            { data: [{ id: causeId }] }, // validate causes
            { data: [{ id: actionId }] }, // validate actions
            { data: [] }, // delete origins
            { data: [{ id: "new-origin-rel" }] }, // insert origins
            { data: [] }, // delete causes
            { data: [{ id: "new-cause-rel" }] }, // insert causes
            { data: [] }, // delete actions
            { data: [{ id: "new-action-rel" }] }, // insert actions
            { data: [{ origin_id: originId }] }, // load origins
            { data: [{ cause_id: causeId }] }, // load causes
            { data: [{ action_id: actionId, relation_type: "planned" }] }, // load actions
        ]);

        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities/nc-1", {
            method: "PATCH",
            body: JSON.stringify({
                origin_ids: [originId],
                cause_ids: [causeId],
                action_links: [{
                    action_id: actionId,
                    relation_type: "planned",
                }],
            }),
        });

        const response = await (PATCH_NC as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        }, { params: { id: "nc-1" } });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.nonconformity.origin_ids).toHaveLength(1);
        expect(body.nonconformity.cause_ids).toHaveLength(1);
        expect(body.nonconformity.action_links).toHaveLength(1);
    });

    it("PATCH /sgc/nonconformities/[id] maps DB transition error to 409", async () => {
        const supabase = createMockSupabase([
            { data: { id: "nc-1", org_id: MEMBER_ADMIN.org_id, description: "NC vieja" } },
            { data: null, error: { message: "evaluation_comments is required to close a nonconformity" } },
        ]);
        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities/nc-1", {
            method: "PATCH",
            body: JSON.stringify({ status: "done" }),
        });

        const response = await (PATCH_NC as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        }, { params: { id: "nc-1" } });
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.error).toMatch(/evaluacion/i);
    });

    it("DELETE /sgc/nonconformities/[id] cancels nonconformity", async () => {
        const supabase = createMockSupabase([
            { data: { id: "nc-1", org_id: MEMBER_ADMIN.org_id, status: "open" } },
            { data: { id: "nc-1", org_id: MEMBER_ADMIN.org_id, status: "cancel" } },
        ]);
        const req = new NextRequest("http://localhost/api/v1/sgc/nonconformities/nc-1", { method: "DELETE" });

        const response = await (DELETE_NC as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        }, { params: { id: "nc-1" } });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.nonconformity.status).toBe("cancel");
    });

    it("POST /sgc/actions returns 403 for operador", async () => {
        const supabase = createMockSupabase();
        const req = new NextRequest("http://localhost/api/v1/sgc/actions", {
            method: "POST",
            body: JSON.stringify({ title: "Accion", type_action: "immediate" }),
        });

        const response = await (POST_ACTION as unknown as Handler)(req, {
            supabase,
            member: MEMBER_OPERADOR,
            user: USER,
            enrichAudit: vi.fn(),
        });

        expect(response.status).toBe(403);
    });

    it("POST /sgc/actions creates action and logs audit", async () => {
        const created = { id: "act-1", title: "Accion CAPA", org_id: MEMBER_ADMIN.org_id };
        const supabase = createMockSupabase([{ data: created }]);
        const req = new NextRequest("http://localhost/api/v1/sgc/actions", {
            method: "POST",
            body: JSON.stringify({ title: "Accion CAPA", type_action: "immediate" }),
        });

        const response = await (POST_ACTION as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.action.id).toBe("act-1");
        expect(logAuditMock).toHaveBeenCalled();
    });

    it("PATCH /sgc/actions/[id] maps invalid transition error to 409", async () => {
        const supabase = createMockSupabase([
            { data: { id: "act-1", org_id: MEMBER_ADMIN.org_id, status: "open", opened_at: "2026-05-03T00:00:00Z" } },
            { data: null, error: { message: "Action cannot return to draft after being opened" } },
        ]);
        const req = new NextRequest("http://localhost/api/v1/sgc/actions/act-1", {
            method: "PATCH",
            body: JSON.stringify({ status: "draft" }),
        });

        const response = await (PATCH_ACTION as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        }, { params: { id: "act-1" } });
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.error).toMatch(/borrador/i);
    });

    it("GET /sgc/audit returns checklist items, cars and timeline", async () => {
        const supabase = createMockSupabase([
            {
                data: [
                    {
                        id: "chk-1",
                        clause_id: "4.1",
                        title: "Contexto",
                        question: "Pregunta",
                        status: "pending",
                        notes: null,
                        tags: ["ISO 9001"],
                        sort_order: 1,
                        next_audit_date: null,
                        updated_at: "2026-05-03T10:00:00.000Z",
                    },
                ],
            },
            {
                data: [
                    {
                        id: "car-1",
                        audit_check_id: "chk-1",
                        car_code: "CAR-0001",
                        finding_clause_id: "4.1",
                        finding_title: "Contexto",
                        description: "Pregunta",
                        status: "open",
                        root_cause: null,
                        action_plan: null,
                        owner_name: null,
                        due_date: null,
                        created_at: "2026-05-03T10:00:00.000Z",
                        updated_at: "2026-05-03T10:05:00.000Z",
                    },
                ],
            },
        ]);

        const req = new NextRequest("http://localhost/api/v1/sgc/audit");
        const response = await (GET_AUDIT as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.items).toHaveLength(1);
        expect(body.cars).toHaveLength(1);
        expect(body.timeline).toHaveLength(2);
        expect(supabase.from).toHaveBeenCalledWith("sgc_audit_checks");
        expect(supabase.from).toHaveBeenCalledWith("sgc_audit_cars");
    });

    it("PATCH /sgc/audit/[id] creates CAR when item is marked noconf", async () => {
        const updatedChecklist = {
            id: "chk-2",
            clause_id: "10.2",
            title: "No conformidad",
            question: "Se corrige la no conformidad?",
            status: "noconf",
            notes: null,
            tags: ["ISO 9001"],
            sort_order: 10,
            next_audit_date: null,
            updated_at: "2026-05-03T11:00:00.000Z",
        };

        const insertedCar = {
            id: "car-2",
            audit_check_id: "chk-2",
            car_code: "CAR-ABCD1234",
            finding_clause_id: "10.2",
            finding_title: "No conformidad",
            description: "Se corrige la no conformidad?",
            status: "open",
            root_cause: null,
            action_plan: null,
            owner_name: null,
            due_date: null,
            created_at: "2026-05-03T11:01:00.000Z",
            updated_at: "2026-05-03T11:01:00.000Z",
        };

        const supabase = createMockSupabase([
            { data: updatedChecklist }, // update check
            { data: null }, // maybeSingle existing car
            { data: insertedCar }, // insert car
        ]);

        const req = new NextRequest("http://localhost/api/v1/sgc/audit/chk-2", {
            method: "PATCH",
            body: JSON.stringify({ status: "noconf" }),
        });

        const response = await (PATCH_AUDIT as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        }, { params: { id: "chk-2" } });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.item.status).toBe("noconf");
        expect(body.car.id).toBe("car-2");
        expect(supabase.from).toHaveBeenCalledWith("sgc_audit_cars");
    });

    it("PATCH /sgc/audit/cars/[id] updates CAR metadata and logs audit", async () => {
        const updatedCar = {
            id: "car-3",
            audit_check_id: "chk-3",
            car_code: "CAR-XYZ12345",
            finding_clause_id: "9.2",
            finding_title: "Auditoria",
            description: "Existe evidencia?",
            status: "in_progress",
            root_cause: "Capacitacion insuficiente",
            action_plan: "Plan anual de entrenamiento",
            owner_name: "Luis",
            due_date: "2026-06-01",
            created_at: "2026-05-03T09:00:00.000Z",
            updated_at: "2026-05-03T12:00:00.000Z",
        };

        const supabase = createMockSupabase([{ data: updatedCar }]);
        const req = new NextRequest("http://localhost/api/v1/sgc/audit/cars/car-3", {
            method: "PATCH",
            body: JSON.stringify({
                status: "in_progress",
                root_cause: "Capacitacion insuficiente",
                action_plan: "Plan anual de entrenamiento",
                owner_name: "Luis",
                due_date: "2026-06-01",
            }),
        });

        const response = await (PATCH_AUDIT_CAR as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        }, { params: { id: "car-3" } });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.car.status).toBe("in_progress");
        expect(body.car.owner_name).toBe("Luis");
        expect(logAuditMock).toHaveBeenCalled();
    });

    it("GET /sgc/catalogs/stages?kind=action uses sgc_action_stages", async () => {
        const supabase = createMockSupabase([{ data: [{ id: "stg-1", name: "Open" }] }]);
        const req = new NextRequest("http://localhost/api/v1/sgc/catalogs/stages?kind=action");

        const response = await (GET_STAGES as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.kind).toBe("action");
        expect(supabase.from).toHaveBeenCalledWith("sgc_action_stages");
    });

    it("POST /sgc/catalogs/stages?kind=nc creates an NC stage", async () => {
        const supabase = createMockSupabase([{ data: { id: "stg-nc-1", name: "Analisis", state: "analysis" } }]);
        const req = new NextRequest("http://localhost/api/v1/sgc/catalogs/stages?kind=nc", {
            method: "POST",
            body: JSON.stringify({ name: "Analisis", state: "analysis", sequence: 20 }),
        });

        const response = await (POST_STAGES as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.kind).toBe("nc");
        expect(supabase.from).toHaveBeenCalledWith("sgc_nc_stages");
    });

    it("GET /sgc/catalogs/origins supports parent_id=null filter", async () => {
        const supabase = createMockSupabase([{ data: [{ id: "o-1", parent_id: null }] }]);
        const req = new NextRequest("http://localhost/api/v1/sgc/catalogs/origins?parent_id=null");

        const response = await (GET_ORIGINS as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.origins).toHaveLength(1);
        expect(supabase.is).toHaveBeenCalledWith("parent_id", null);
    });

    it("POST /sgc/catalogs/origins validates payload", async () => {
        const supabase = createMockSupabase();
        const req = new NextRequest("http://localhost/api/v1/sgc/catalogs/origins", {
            method: "POST",
            body: JSON.stringify({ name: "" }),
        });

        const response = await (POST_ORIGINS as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });

        expect(response.status).toBe(400);
    });

    it("POST /sgc/catalogs/severities enforces role guard", async () => {
        const supabase = createMockSupabase();
        const req = new NextRequest("http://localhost/api/v1/sgc/catalogs/severities", {
            method: "POST",
            body: JSON.stringify({ name: "Alta", sequence: 10 }),
        });

        const response = await (POST_SEVERITIES as unknown as Handler)(req, {
            supabase,
            member: MEMBER_OPERADOR,
            user: USER,
            enrichAudit: vi.fn(),
        });

        expect(response.status).toBe(403);
    });

    it("POST /sgc/catalogs/severities creates catalog record", async () => {
        const supabase = createMockSupabase([{ data: { id: "sev-1", name: "Alta" } }]);
        const req = new NextRequest("http://localhost/api/v1/sgc/catalogs/severities", {
            method: "POST",
            body: JSON.stringify({ name: "Alta", sequence: 10 }),
        });

        const response = await (POST_SEVERITIES as unknown as Handler)(req, {
            supabase,
            member: MEMBER_ADMIN,
            user: USER,
            enrichAudit: vi.fn(),
        });
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.severity.id).toBe("sev-1");
    });
});
