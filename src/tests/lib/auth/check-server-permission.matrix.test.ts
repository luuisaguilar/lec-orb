import { describe, expect, it } from "vitest";
import { checkServerPermission } from "@/lib/auth/permissions";

type Action = "view" | "edit" | "delete";

type PermissionRow = {
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
} | null;

function createSupabaseMock(role: string | null, permissionRow: PermissionRow) {
    return {
        from(table: string) {
            if (table === "org_members") {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    single: async () =>
                                        role
                                            ? { data: { id: "member-1", role }, error: null }
                                            : { data: null, error: { message: "not found" } },
                                };
                            },
                        };
                    },
                };
            }

            if (table === "member_module_access") {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            single: async () =>
                                                permissionRow
                                                    ? { data: permissionRow, error: null }
                                                    : { data: null, error: { message: "not found" } },
                                        };
                                    },
                                };
                            },
                        };
                    },
                };
            }

            throw new Error(`Unexpected table mock access: ${table}`);
        },
    };
}

describe("checkServerPermission matrix (9 grupos: role x action)", () => {
    const matrix: Array<{
        name: string;
        role: "admin" | "supervisor" | "operador";
        action: Action;
        permissionRow: PermissionRow;
        expected: boolean;
    }> = [
        {
            name: "admin:view allows regardless of granular row",
            role: "admin",
            action: "view",
            permissionRow: null,
            expected: true,
        },
        {
            name: "admin:edit allows regardless of granular row",
            role: "admin",
            action: "edit",
            permissionRow: null,
            expected: true,
        },
        {
            name: "admin:delete allows regardless of granular row",
            role: "admin",
            action: "delete",
            permissionRow: null,
            expected: true,
        },
        {
            name: "supervisor:view uses granular can_view=true",
            role: "supervisor",
            action: "view",
            permissionRow: { can_view: true, can_edit: true, can_delete: true },
            expected: true,
        },
        {
            name: "supervisor:edit uses granular can_edit=false",
            role: "supervisor",
            action: "edit",
            permissionRow: { can_view: true, can_edit: false, can_delete: true },
            expected: false,
        },
        {
            name: "supervisor:delete uses granular can_delete=false",
            role: "supervisor",
            action: "delete",
            permissionRow: { can_view: true, can_edit: true, can_delete: false },
            expected: false,
        },
        {
            name: "operador:view uses granular can_view=true",
            role: "operador",
            action: "view",
            permissionRow: { can_view: true, can_edit: true, can_delete: false },
            expected: true,
        },
        {
            name: "operador:edit uses granular can_edit=true",
            role: "operador",
            action: "edit",
            permissionRow: { can_view: true, can_edit: true, can_delete: false },
            expected: true,
        },
        {
            name: "operador:delete uses granular can_delete=false",
            role: "operador",
            action: "delete",
            permissionRow: { can_view: true, can_edit: true, can_delete: false },
            expected: false,
        },
    ];

    for (const scenario of matrix) {
        it(scenario.name, async () => {
            const supabase = createSupabaseMock(scenario.role, scenario.permissionRow);
            const allowed = await checkServerPermission(
                supabase,
                "user-1",
                "project-management",
                scenario.action
            );
            expect(allowed).toBe(scenario.expected);
        });
    }

    it("fails closed when non-admin user has no granular row", async () => {
        const supabase = createSupabaseMock("supervisor", null);
        const allowed = await checkServerPermission(
            supabase,
            "user-1",
            "project-management",
            "view"
        );
        expect(allowed).toBe(false);
    });

    it("crm API module: aggregates submodule rows (crm-pipeline) for view", async () => {
        const crmSupabase = {
            from(table: string) {
                if (table !== "member_module_access") {
                    throw new Error(`Unexpected table: ${table}`);
                }
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    in: () =>
                                        Promise.resolve({
                                            data: [{ can_view: true, can_edit: true, can_delete: false }],
                                            error: null,
                                        }),
                                };
                            },
                        };
                    },
                };
            },
        };

        const allowed = await checkServerPermission(
            crmSupabase as any,
            "user-1",
            "crm",
            "view",
            { id: "m1", role: "supervisor" }
        );
        expect(allowed).toBe(true);
    });
});

