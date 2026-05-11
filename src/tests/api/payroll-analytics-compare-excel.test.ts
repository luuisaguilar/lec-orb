import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { GET as analyticsGET } from "@/app/api/v1/payroll/analytics/route";
import { POST as compareExcelPOST } from "@/app/api/v1/payroll/compare-excel/route";
import type { AuthContext } from "@/lib/auth/with-handler";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: unknown) => handler,
}));

type HandlerCtx = Pick<AuthContext, "supabase" | "user" | "member">;

/** Chain ending with await … .single() → Promise<{ data, error }> */
function chainSingle<T>(data: T, error: unknown = null) {
    const self: Record<string, unknown> = {};
    self.select = vi.fn(() => self);
    self.eq = vi.fn(() => self);
    self.in = vi.fn(() => self);
    self.single = vi.fn(() => Promise.resolve({ data, error }));
    return self;
}

/** Chain ending with await builder (no .single()) */
function chainThen<T>(data: T, error: unknown = null) {
    const self: Record<string, unknown> = {};
    const res = { data, error };
    self.select = vi.fn(() => self);
    self.eq = vi.fn(() => self);
    self.in = vi.fn(() => self);
    self.then = (onFulfilled: (v: typeof res) => unknown) => Promise.resolve(res).then(onFulfilled);
    return self;
}

function makeXlsxFile(rows: (string | number)[][]) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "H1");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new File([buf], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
}

/** Vitest/NextRequest no siempre rellena multipart/form-data; el handler solo necesita formData + header. */
function makeMultipartCompareRequest(fd: FormData): NextRequest {
    return {
        headers: {
            get: (name: string) =>
                name.toLowerCase() === "content-type" ? "multipart/form-data; boundary=test" : null,
        },
        formData: async () => fd,
    } as unknown as NextRequest;
}

describe("GET /api/v1/payroll/analytics", () => {
    const member = { id: "m1", org_id: "org-1", role: "admin" as const };
    const user = { id: "u1" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 when periodId is missing", async () => {
        const supabase = { from: vi.fn() };
        const req = new NextRequest("http://localhost/api/v1/payroll/analytics");
        const res = await (analyticsGET as (req: NextRequest, ctx: HandlerCtx) => Promise<Response>)(
            req,
            { supabase: supabase as never, user, member }
        );
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/periodId/);
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it("returns 404 when period is not in org", async () => {
        const supabase = {
            from: vi.fn(() => chainSingle(null, null)),
        };
        const req = new NextRequest("http://localhost/api/v1/payroll/analytics?periodId=per-missing");
        const res = await (analyticsGET as (req: NextRequest, ctx: HandlerCtx) => Promise<Response>)(
            req,
            { supabase: supabase as never, user, member }
        );
        expect(res.status).toBe(404);
    });

    it("returns empty breakdown when there are no entries", async () => {
        const period = { id: "per1", name: "P1", start_date: "2026-01-01", end_date: "2026-01-15", status: "open", total_amount: 0 };
        const supabase = {
            from: vi.fn((table: string) => {
                if (table === "payroll_periods") return chainSingle(period);
                if (table === "payroll_entries") return chainThen([]);
                throw new Error(`unexpected ${table}`);
            }),
        };
        const req = new NextRequest("http://localhost/api/v1/payroll/analytics?periodId=per1");
        const res = await (analyticsGET as (req: NextRequest, ctx: HandlerCtx) => Promise<Response>)(
            req,
            { supabase: supabase as never, user, member }
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.byApplicator).toEqual([]);
        expect(body.alerts).toContain("No hay entradas de nómina para este período.");
    });

    it("aggregates by applicator, event and school", async () => {
        const period = {
            id: "per1",
            name: "P1",
            start_date: "2026-01-01",
            end_date: "2026-01-31",
            status: "calculated",
            total_amount: 1000,
        };
        const entries = [
            {
                id: "ent1",
                applicator_id: "app-1",
                applicator_name: "María Gómez",
                hours_worked: 4,
                subtotal: 800,
                total: 800,
                adjustments: 0,
                status: "approved",
            },
        ];
        const lines = [
            {
                entry_id: "ent1",
                event_id: "ev1",
                event_name: "Examen A",
                projected_amount: 400,
                projected_hours: 2,
                actual_amount: 400,
                actual_hours: 2,
                is_confirmed: true,
                line_type: "work",
            },
            {
                entry_id: "ent1",
                event_id: "ev1",
                event_name: "Examen A",
                projected_amount: 400,
                projected_hours: 2,
                actual_amount: 400,
                actual_hours: 2,
                is_confirmed: true,
                line_type: "work",
            },
        ];
        const events = [{ id: "ev1", title: "Examen A", date: "2026-01-10", school_id: "sch1" }];
        const schools = [{ id: "sch1", name: "Colegio Norte" }];

        const supabase = {
            from: vi.fn((table: string) => {
                if (table === "payroll_periods") return chainSingle(period);
                if (table === "payroll_entries") return chainThen(entries);
                if (table === "payroll_line_items") return chainThen(lines);
                if (table === "events") return chainThen(events);
                if (table === "schools") return chainThen(schools);
                throw new Error(`unexpected ${table}`);
            }),
        };

        const req = new NextRequest("http://localhost/api/v1/payroll/analytics?periodId=per1");
        const res = await (analyticsGET as (req: NextRequest, ctx: HandlerCtx) => Promise<Response>)(
            req,
            { supabase: supabase as never, user, member }
        );
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body.byApplicator).toHaveLength(1);
        expect(body.byApplicator[0].applicator_name).toBe("María Gómez");
        expect(body.byApplicator[0].projectedTotal).toBe(800);
        expect(body.byApplicator[0].actualTotal).toBe(800);

        expect(body.byEvent).toHaveLength(1);
        expect(body.byEvent[0].school_name).toBe("Colegio Norte");

        expect(body.bySchool).toHaveLength(1);
        expect(body.bySchool[0].school_id).toBe("sch1");
        expect(body.bySchool[0].lineCount).toBe(2);

        expect(body.totals.projected).toBe(800);
        expect(body.totals.actual).toBe(800);
    });
});

describe("POST /api/v1/payroll/compare-excel", () => {
    const member = { id: "m1", org_id: "org-1", role: "admin" as const };
    const user = { id: "u1" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 for non-multipart requests", async () => {
        const supabase = { from: vi.fn() };
        const req = new NextRequest("http://localhost/api/v1/payroll/compare-excel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        const res = await (compareExcelPOST as (req: NextRequest, ctx: HandlerCtx) => Promise<Response>)(
            req,
            { supabase: supabase as never, user, member }
        );
        expect(res.status).toBe(400);
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it("returns 400 when file or periodId is missing", async () => {
        const supabase = { from: vi.fn() };
        const fd = new FormData();
        fd.append("periodId", "per1");
        const req = makeMultipartCompareRequest(fd);
        const res = await (compareExcelPOST as (req: NextRequest, ctx: HandlerCtx) => Promise<Response>)(
            req,
            { supabase: supabase as never, user, member }
        );
        expect(res.status).toBe(400);
    });

    it("returns JSON with mismatches when file totals differ from system", async () => {
        const supabase = {
            from: vi.fn((table: string) => {
                if (table === "payroll_periods") return chainSingle({ id: "per1" });
                if (table === "payroll_entries")
                    return chainThen([{ applicator_name: "Luis Pérez", total: 500 }]);
                throw new Error(`unexpected ${table}`);
            }),
        };

        const file = makeXlsxFile([
            ["Nombre", "Total"],
            ["Luis Pérez", 100],
        ]);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("periodId", "per1");

        const req = makeMultipartCompareRequest(fd);
        const res = await (compareExcelPOST as (req: NextRequest, ctx: HandlerCtx) => Promise<Response>)(
            req,
            { supabase: supabase as never, user, member }
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.mismatchCount).toBeGreaterThanOrEqual(1);
        expect(body.mismatches[0].delta).toBeDefined();
    });

    it("returns xlsx attachment when download=1", async () => {
        const supabase = {
            from: vi.fn((table: string) => {
                if (table === "payroll_periods") return chainSingle({ id: "per1" });
                if (table === "payroll_entries")
                    return chainThen([{ applicator_name: "Ana", total: 200 }]);
                throw new Error(`unexpected ${table}`);
            }),
        };

        const file = makeXlsxFile([
            ["Nombre", "Importe"],
            ["Ana", 50],
        ]);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("periodId", "per1");
        fd.append("download", "1");

        const req = makeMultipartCompareRequest(fd);
        const res = await (compareExcelPOST as (req: NextRequest, ctx: HandlerCtx) => Promise<Response>)(
            req,
            { supabase: supabase as never, user, member }
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("spreadsheetml");
        const buf = Buffer.from(await res.arrayBuffer());
        const wb = XLSX.read(buf, { type: "buffer" });
        expect(wb.SheetNames).toContain("Comparacion");
    });
});
