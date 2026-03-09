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


// Maps the loose string module names used in API route calls to the typed Module enum.
// This bridges the gap between checkServerPermission("eventos", ...) and Module = "events".
const MODULE_ALIAS_MAP: Record<string, { module: Module; readAction: Action; writeAction: Action; deleteAction: Action }> = {
    // Finance
    finanzas: { module: "inventory", readAction: "read", writeAction: "create", deleteAction: "delete" },
    // Inventory
    inventario: { module: "inventory", readAction: "read", writeAction: "create", deleteAction: "delete" },
    // Events
    eventos: { module: "events", readAction: "read", writeAction: "create", deleteAction: "delete" },
    // Applicators
    aplicadores: { module: "applicators", readAction: "read", writeAction: "create", deleteAction: "delete" },
    // Schools / Colegios
    colegios: { module: "schools", readAction: "read", writeAction: "create", deleteAction: "delete" },
    // CENNI
    cenni: { module: "cenni", readAction: "read", writeAction: "create", deleteAction: "delete" },
    // Exams
    examenes: { module: "catalog", readAction: "read", writeAction: "manage", deleteAction: "manage" },
    // Users
    usuarios: { module: "users", readAction: "read", writeAction: "manage", deleteAction: "manage" },
};

/**
 * Server-side helper to check granular permissions.
 *
 * Lookup order:
 * 1. Admin shortcut — always true
 * 2. member_module_access table (granular per-member settings)
 * 3. Static permissionsMap fallback (role-based default) — prevents supervisor lockout
 *    when no row exists in member_module_access yet
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
    if (member.role === 'admin') return true; // Admin always has access

    // 2. Check granular access table
    const { data: access } = await supabase
        .from('member_module_access')
        .select('can_view, can_edit, can_delete')
        .eq('member_id', member.id)
        .eq('module', module)
        .single();

    if (access) {
        // Granular row exists — use it
        if (action === "view") return access.can_view;
        if (action === "edit") return access.can_edit;
        if (action === "delete") return access.can_delete;
        return false;
    }

    // 3. No granular row — fall back to the static RBAC permissionsMap
    //    This prevents users from losing access when a new module is protected
    //    but their member_module_access rows haven't been configured yet.
    const alias = MODULE_ALIAS_MAP[module];
    if (alias) {
        const staticAction: Action = action === "view"
            ? alias.readAction
            : action === "edit"
                ? alias.writeAction
                : alias.deleteAction;
        return hasPermission(member.role as Role, alias.module, staticAction);
    }

    // Unknown module — deny by default
    return false;
}
