// RBAC Permissions Map
// Roles hierarchy: admin > supervisor > operador > applicator

export type Role = "admin" | "supervisor" | "operador" | "applicator";

export type Module =
    | "inventory"
    | "schools"
    | "applicators"
    | "events"
    | "catalog"
    | "payroll"
    | "cenni"
    | "calculator"
    | "metrics"
    | "users"
    | "venues";

export type Action =
    | "read"
    | "create"
    | "update"
    | "delete"
    | "loan"
    | "return"
    | "assign_staff"
    | "calculate"
    | "pay"
    | "manage";

// Static permissions map
const permissionsMap: Record<Module, Partial<Record<Action, Role[]>>> = {
    inventory: {
        read: ["admin", "supervisor", "operador", "applicator"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
        loan: ["admin", "supervisor", "operador", "applicator"],
        return: ["admin", "supervisor", "operador", "applicator"],
    },
    schools: {
        read: ["admin", "supervisor", "operador", "applicator"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    applicators: {
        read: ["admin", "supervisor", "operador", "applicator"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    events: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
        assign_staff: ["admin", "supervisor"],
    },
    catalog: {
        read: ["admin", "supervisor", "operador", "applicator"],
        manage: ["admin"],
    },
    payroll: {
        read: ["admin", "supervisor"],
        calculate: ["admin", "supervisor"],
        pay: ["admin"],
    },
    cenni: {
        read: ["admin", "supervisor"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    calculator: {
        read: ["admin", "supervisor", "operador", "applicator"],
    },
    metrics: {
        read: ["admin", "supervisor"],
    },
    users: {
        read: ["admin"],
        manage: ["admin"],
    },
    venues: {
        read: ["admin", "supervisor", "operador", "applicator"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
};

/**
 * Check if a role has permission for a specific action on a module.
 */
export function hasPermission(
    role: Role,
    module: Module,
    action: Action
): boolean {
    if (role === "admin") return true; // Admin has all permissions
    const modulePerms = permissionsMap[module];
    if (!modulePerms) return false;
    const allowedRoles = modulePerms[action];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role);
}

/**
 * Check if a user can access a module based on role and module access restrictions.
 * Rules:
 *   - Admin always has access
 *   - If moduleAccessRows is empty (0 rows), user is unrestricted
 *   - If moduleAccessRows has entries, user only sees listed modules
 */
export function canAccessModule(
    role: Role,
    moduleAccessRows: string[], // list of module slugs the user is granted
    module: Module
): boolean {
    if (role === "admin") return true;
    if (moduleAccessRows.length === 0) return true; // unrestricted
    return moduleAccessRows.includes(module);
}

/**
 * Returns the modules a role can read (for nav filtering).
 */
export function getReadableModules(role: Role): Module[] {
    return (Object.keys(permissionsMap) as Module[]).filter((mod) =>
        hasPermission(role, mod, "read")
    );
}

/**
 * Server-side helper to check granular permissions.
 */
export async function checkServerPermission(
    supabase: any,
    userId: string,
    module: string,
    action: "view" | "edit" | "delete"
): Promise<boolean> {
    // 1. Get member role
    const { data: member } = await supabase
        .from('org_members')
        .select('id, role')
        .eq('user_id', userId)
        .single();

    if (!member) return false;
    if (member.role === 'admin') return true;

    // 2. Check granular access
    const { data: access } = await supabase
        .from('member_module_access')
        .select('can_view, can_edit, can_delete')
        .eq('member_id', member.id)
        .eq('module', module)
        .single();

    if (!access) {
        // Default behavior: if no row exists, we might want to allow view but not edit/delete for supervisors?
        // Let's be strict: no row = no access unless admin.
        return false;
    }

    if (action === "view") return access.can_view;
    if (action === "edit") return access.can_edit;
    if (action === "delete") return access.can_delete;

    return false;
}
