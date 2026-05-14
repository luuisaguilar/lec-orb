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
    | "venues"
    | "toefl"
    | "toefl-codes"
    | "suppliers"
    | "quotes"
    | "purchase-orders"
    | "payments"
    | "exam-codes"
    | "documents"
    | "notifications"
    | "studio"
    | "budget"
    | "petty-cash"
    | "courses"
    | "crm-prospects"
    | "oopt-pdf"
    | "ielts"
    | "audit-log"
    | "coordinacion-proyectos-lec";

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
    toefl: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    "toefl-codes": {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    suppliers: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    quotes: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    "purchase-orders": {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    payments: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    "exam-codes": {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    documents: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    notifications: {
        read: ["admin", "supervisor", "operador"],
        manage: ["admin", "supervisor"],
    },
    studio: {
        read: ["admin"],
        manage: ["admin"],
    },
    budget: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    "petty-cash": {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    "audit-log": {
        read: ["admin", "supervisor"],
    },
    courses: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    "crm-prospects": {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor", "operador"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    "oopt-pdf": {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    ielts: {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor"],
        update: ["admin", "supervisor"],
        delete: ["admin"],
    },
    "coordinacion-proyectos-lec": {
        read: ["admin", "supervisor", "operador"],
        create: ["admin", "supervisor", "operador"],
        update: ["admin", "supervisor", "operador"],
        delete: ["admin", "supervisor"],
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
export const MODULE_ALIAS_MAP: Record<string, { module: Module; readAction: Action; writeAction: Action; deleteAction: Action }> = {
    // Finance
    finanzas: { module: "payments", readAction: "read", writeAction: "create", deleteAction: "delete" },
    cotizaciones: { module: "quotes", readAction: "read", writeAction: "create", deleteAction: "delete" },
    ordenes: { module: "purchase-orders", readAction: "read", writeAction: "create", deleteAction: "delete" },
    payments: { module: "payments", readAction: "read", writeAction: "create", deleteAction: "delete" },
    nomina: { module: "payroll", readAction: "read", writeAction: "calculate", deleteAction: "manage" },
    
    // Inventory
    inventario: { module: "inventory", readAction: "read", writeAction: "create", deleteAction: "delete" },
    inventory: { module: "inventory", readAction: "read", writeAction: "create", deleteAction: "delete" },

    // Events / Institutional
    eventos: { module: "events", readAction: "read", writeAction: "create", deleteAction: "delete" },
    aplicadores: { module: "applicators", readAction: "read", writeAction: "create", deleteAction: "delete" },
    colegios: { module: "schools", readAction: "read", writeAction: "create", deleteAction: "delete" },
    venues: { module: "venues", readAction: "read", writeAction: "create", deleteAction: "delete" },

    // Exams
    toefl: { module: "toefl", readAction: "read", writeAction: "create", deleteAction: "delete" },
    "toefl-codes": { module: "toefl-codes", readAction: "read", writeAction: "create", deleteAction: "delete" },
    cenni: { module: "cenni", readAction: "read", writeAction: "create", deleteAction: "delete" },
    examenes: { module: "exam-codes", readAction: "read", writeAction: "create", deleteAction: "delete" },
    "exam-codes": { module: "exam-codes", readAction: "read", writeAction: "create", deleteAction: "delete" },
    
    // Tools / Admin
    usuarios: { module: "users", readAction: "read", writeAction: "manage", deleteAction: "manage" },
    users: { module: "users", readAction: "read", writeAction: "manage", deleteAction: "manage" },
    documentos: { module: "documents", readAction: "read", writeAction: "create", deleteAction: "delete" },
    documents: { module: "documents", readAction: "read", writeAction: "create", deleteAction: "delete" },
    notifications: { module: "notifications", readAction: "read", writeAction: "manage", deleteAction: "manage" },
    "audit-log": { module: "audit-log", readAction: "read", writeAction: "read", deleteAction: "read" },
    studio: { module: "studio", readAction: "read", writeAction: "manage", deleteAction: "manage" },
    courses: { module: "courses", readAction: "read", writeAction: "create", deleteAction: "delete" },
    cursos: { module: "courses", readAction: "read", writeAction: "create", deleteAction: "delete" },
    prospectos: { module: "crm-prospects", readAction: "read", writeAction: "create", deleteAction: "delete" },
    "oopt-pdf": { module: "oopt-pdf", readAction: "read", writeAction: "create", deleteAction: "delete" },
    ielts: { module: "ielts", readAction: "read", writeAction: "create", deleteAction: "delete" },
    "coordinacion-proyectos-lec": {
        module: "coordinacion-proyectos-lec",
        readAction: "read",
        writeAction: "create",
        deleteAction: "delete",
    },
    "coordinacion-proyectos": {
        module: "coordinacion-proyectos-lec",
        readAction: "read",
        writeAction: "create",
        deleteAction: "delete",
    },
};

/** Native CRM API routes use `module: "crm"`; `member_module_access` rows use submodule slugs (crm-pipeline, …). */
const CRM_ACCESS_SLUGS = ["crm", "crm-pipeline", "crm-directory", "crm-activities", "crm-metrics"] as const;

/**
 * Server-side helper to check granular permissions.
 *
 * Lookup order:
 * 1. Admin shortcut — always true
 * 2. member_module_access table (granular per-member settings)
 * 3. Fail-closed if no matching rows
 *
 * When `requestMember` is passed (from withAuth), avoids a second `org_members` query and stays aligned
 * with `getAuthenticatedMember` (important for multi-org users).
 */
export async function checkServerPermission(
    supabase: any,
    userId: string,
    module: string,
    action: "view" | "edit" | "delete",
    requestMember?: { id: string; role: string }
): Promise<boolean> {
    let memberId: string;
    let role: string;

    if (requestMember) {
        memberId = requestMember.id;
        role = requestMember.role;
    } else {
        const { data: member } = await supabase
            .from("org_members")
            .select("id, role")
            .eq("user_id", userId)
            .single();

        if (!member) return false;
        memberId = member.id;
        role = member.role;
    }

    if (role === "admin") return true;

    if (module === "crm") {
        const { data: rows, error } = await supabase
            .from("member_module_access")
            .select("can_view, can_edit, can_delete")
            .eq("member_id", memberId)
            .in("module", [...CRM_ACCESS_SLUGS]);

        if (error || !rows?.length) return false;

        type AccessFlags = { can_view: boolean; can_edit: boolean; can_delete: boolean };
        const agg = (rows as AccessFlags[]).reduce(
            (a: AccessFlags, r: AccessFlags) => ({
                can_view: a.can_view || Boolean(r.can_view),
                can_edit: a.can_edit || Boolean(r.can_edit),
                can_delete: a.can_delete || Boolean(r.can_delete),
            }),
            { can_view: false, can_edit: false, can_delete: false }
        );

        if (action === "view") return agg.can_view || agg.can_edit;
        if (action === "edit") return agg.can_edit;
        if (action === "delete") return agg.can_delete;
        return false;
    }

    const { data: access, error } = await supabase
        .from("member_module_access")
        .select("can_view, can_edit, can_delete")
        .eq("member_id", memberId)
        .eq("module", module)
        .single();

    if (error || !access) return false;

    if (action === "view") return access.can_view;
    if (action === "edit") return access.can_edit;
    if (action === "delete") return access.can_delete;
    return false;
}
