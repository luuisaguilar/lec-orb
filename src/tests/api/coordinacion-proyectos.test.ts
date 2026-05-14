import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as CatalogGET } from "@/app/api/v1/coordinacion-proyectos/catalog/route";
import { importBodySchema } from "@/lib/coordinacion-proyectos/schemas";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

describe("Coordinación proyectos LEC", () => {
    const mockMember = { id: "m1", org_id: "org-1", role: "admin" };
    const mockUser = { id: "u1" };

    it("importBodySchema accepts bulk payload", () => {
        const r = importBodySchema.safeParse({ entity: "program_projects", rows: [{ Mes: "ENE", Descripción: "X" }] });
        expect(r.success).toBe(true);
    });

    it("catalog GET returns three lists", async () => {
        const mockSupabase: any = {
            from(table: string) {
                this._t = table;
                return this;
            },
            select() {
                return this;
            },
            eq() {
                return this;
            },
            order() {
                const name =
                    this._t === "lec_cp_departments"
                        ? "d1"
                        : this._t === "lec_cp_exam_types"
                          ? "e1"
                          : "p1";
                return { data: [{ id: "1", name }], error: null };
            },
        };

        const req = new NextRequest("http://localhost/api/v1/coordinacion-proyectos/catalog");
        const res = await (CatalogGET as any)(req, { supabase: mockSupabase, user: mockUser, member: mockMember });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.departments[0].name).toBe("d1");
        expect(body.examTypes[0].name).toBe("e1");
        expect(body.productServices[0].name).toBe("p1");
    });
});
