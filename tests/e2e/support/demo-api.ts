import type { Page, Route } from "@playwright/test";

type DemoCategory = {
    id: string;
    name: string;
    slug: string;
};

type DemoMovement = {
    id: string;
    org_id: string;
    category_id: string;
    date: string;
    concept: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
    notes: string | null;
    petty_cash_categories: {
        name: string;
        slug: string;
    };
    organizations: {
        name: string;
        slug: string;
    };
};

type DemoBudget = {
    id: string;
    org_id: string;
    category_id: string;
    month: number;
    year: number;
    amount: number;
    petty_cash_categories: {
        name: string;
        slug: string;
    };
};

type DemoPoaLine = {
    id: string;
    org_id: string;
    year: number;
    month: number;
    source: "CAJA_CHICA" | "CUENTA_BAC";
    section: string;
    concept: string;
    budgeted_amount: number;
    real_amount: number | null;
    notes: string | null;
    sort_order: number;
};

type DemoHrProfile = {
    id: string;
    node_id: string;
    org_id: string;
    role_title: string;
    holder_name: string | null;
    area: string | null;
    role_type: string | null;
    mission: string | null;
    responsibilities: string[];
    requirements: Record<string, string | null>;
    parent_node_id: string | null;
    process_id: string | null;
    last_pdf_path: string | null;
    created_at: string;
    updated_at: string;
};

type DemoOrgLocation = {
    id: string;
    org_id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

type DemoInvitation = {
    id: string;
    org_id: string;
    email: string;
    role: "admin" | "supervisor" | "operador" | "applicator";
    status: "pending" | "accepted" | "expired" | "revoked";
    created_at: string;
    token: string;
    job_title: string | null;
    location: string | null;
    hr_profile_id: string | null;
    invited_by?: string;
    expires_at?: string;
};

type DemoMember = {
    id: string;
    user_id: string;
    role: string;
    location: string | null;
    job_title: string | null;
    created_at: string;
    full_name: string;
    email: string;
};

type DemoTravelReport = {
    id: string;
    org_id: string;
    payroll_period_id: string | null;
    employee_name: string;
    destination: string;
    trip_purpose: string;
    start_date: string;
    end_date: string;
    amount_requested: number;
    amount_approved: number | null;
    status: "pending" | "approved" | "rejected" | "reimbursed";
    approval_notes: string | null;
    approved_by: string | null;
    approved_at: string | null;
    created_by: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
    receipts?: DemoTravelReceipt[];
    receipts_total?: number;
    payroll_period_name?: string | null;
};

type DemoTravelReceipt = {
    id: string;
    org_id: string;
    report_id: string;
    file_name: string;
    file_type: "pdf" | "xlsx" | "xls" | "csv" | "other";
    file_url: string;
    amount: number | null;
    notes: string | null;
    uploaded_by: string;
    created_at: string;
    updated_at: string;
};

type DemoRoleRate = {
    id: string;
    org_id: string;
    role: string;
    exam_type: string | null;
    rate_per_hour: number;
    effective_from: string;
    effective_to: string | null;
    notes: string | null;
};

type DemoPmProject = {
    id: string;
    org_id: string;
    key: string | null;
    name: string;
    description: string | null;
    status: "active" | "archived";
    created_at: string;
    updated_at: string;
};

type DemoPmBoard = {
    id: string;
    org_id: string;
    project_id: string;
    name: string;
    default_view: "kanban" | "table";
};

type DemoPmColumn = {
    id: string;
    org_id: string;
    board_id: string;
    name: string;
    slug: string;
    sort_order: number;
    is_done: boolean;
};

type DemoPmTask = {
    id: string;
    org_id: string;
    project_id: string;
    board_id: string;
    column_id: string;
    ref: string | null;
    title: string;
    description: string | null;
    priority: "low" | "normal" | "high" | "urgent";
    sort_order: number;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
};

const ORG = {
    id: "demo-org-001",
    name: "LEC Demo",
    slug: "lec-demo",
};

const DEMO_HR_PROFILE_ID = "hp-demo-001";

function isoDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString();
}

function dateOnly(offsetDays = 0) {
    return isoDate(offsetDays).slice(0, 10);
}

function json(route: Route, body: unknown, status = 200) {
    return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
    });
}

function parseBody(route: Route) {
    const raw = route.request().postData();
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function matchesPath(pathname: string, exact: string) {
    return pathname === exact || pathname === `${exact}/`;
}

function createDemoState() {
    const categories: DemoCategory[] = [
        { id: "cat-001", name: "Papeleria", slug: "papeleria" },
        { id: "cat-002", name: "Transporte", slug: "transporte" },
        { id: "cat-003", name: "Operaciones", slug: "operaciones" },
    ];

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const movements: DemoMovement[] = [
        {
            id: "mov-001",
            org_id: ORG.id,
            category_id: "cat-001",
            date: dateOnly(-1),
            concept: "Papeleria de oficina",
            type: "EXPENSE",
            amount: 450,
            notes: "Compra semanal",
            petty_cash_categories: { name: "Papeleria", slug: "papeleria" },
            organizations: { name: ORG.name, slug: ORG.slug },
        },
        {
            id: "mov-002",
            org_id: ORG.id,
            category_id: "cat-002",
            date: dateOnly(-2),
            concept: "Taxi al evento",
            type: "EXPENSE",
            amount: 220,
            notes: null,
            petty_cash_categories: { name: "Transporte", slug: "transporte" },
            organizations: { name: ORG.name, slug: ORG.slug },
        },
        {
            id: "mov-003",
            org_id: ORG.id,
            category_id: "cat-003",
            date: dateOnly(-3),
            concept: "Deposito inicial",
            type: "INCOME",
            amount: 5000,
            notes: "Fondo base",
            petty_cash_categories: { name: "Operaciones", slug: "operaciones" },
            organizations: { name: ORG.name, slug: ORG.slug },
        },
    ];

    const budgets: DemoBudget[] = categories.map((category, index) => ({
        id: `budget-00${index + 1}`,
        org_id: ORG.id,
        category_id: category.id,
        month,
        year,
        amount: [3000, 1800, 4000][index],
        petty_cash_categories: {
            name: category.name,
            slug: category.slug,
        },
    }));

    const poaLines: DemoPoaLine[] = [
        {
            id: "poa-001",
            org_id: ORG.id,
            year,
            month,
            source: "CAJA_CHICA",
            section: "Operaciones",
            concept: "Papeleria",
            budgeted_amount: 3000,
            real_amount: 1200,
            notes: null,
            sort_order: 0,
        },
    ];

    const hrProfiles: DemoHrProfile[] = [
        {
            id: DEMO_HR_PROFILE_ID,
            node_id: "node-demo-1",
            org_id: ORG.id,
            role_title: "Coordinador Demo",
            holder_name: null,
            area: "Operaciones",
            role_type: "coordination",
            mission: null,
            responsibilities: [],
            requirements: {},
            parent_node_id: null,
            process_id: null,
            last_pdf_path: null,
            created_at: isoDate(-10),
            updated_at: isoDate(-10),
        },
    ];

    const orgLocations: DemoOrgLocation[] = [
        {
            id: "loc-demo-001",
            org_id: ORG.id,
            name: "Hermosillo",
            sort_order: 0,
            is_active: true,
            created_at: isoDate(-10),
            updated_at: isoDate(-10),
        },
    ];

    const invitations: DemoInvitation[] = [
        {
            id: "invite-001",
            org_id: ORG.id,
            email: "pendiente@lec.mx",
            role: "supervisor",
            status: "pending",
            created_at: isoDate(-1),
            token: "token-pending-001",
            job_title: "Coordinador Demo",
            location: "Hermosillo",
            hr_profile_id: DEMO_HR_PROFILE_ID,
            invited_by: "demo-user-001",
            expires_at: isoDate(7),
        },
        {
            id: "invite-002",
            org_id: ORG.id,
            email: "expirada@lec.mx",
            role: "operador",
            status: "expired",
            created_at: isoDate(-5),
            token: "token-expired-002",
            job_title: "Operador",
            location: "Hermosillo",
            hr_profile_id: null,
            expires_at: isoDate(-1),
        },
    ];

    const members: DemoMember[] = [
        {
            id: "member-001",
            user_id: "user-001",
            role: "admin",
            location: "Hermosillo",
            job_title: "Administracion",
            created_at: isoDate(-30),
            full_name: "Demo Admin",
            email: "demo.admin@lec.mx",
        },
        {
            id: "member-002",
            user_id: "user-002",
            role: "supervisor",
            location: "CDMX",
            job_title: "Coordinacion",
            created_at: isoDate(-14),
            full_name: "Laura Supervisor",
            email: "laura.supervisor@lec.mx",
        },
    ];

    const modules = [
        {
            id: "module-dashboard",
            slug: "dashboard",
            name: "Dashboard",
            icon: "Home",
            category: null,
            is_native: true,
            sort_order: 0,
        },
        {
            id: "module-petty-cash",
            slug: "petty-cash",
            name: "Caja Chica",
            icon: "DollarSign",
            category: "Finanzas",
            is_native: true,
            sort_order: 10,
        },
        {
            id: "module-budget",
            slug: "budget",
            name: "Presupuesto",
            icon: "PieChart",
            category: "Finanzas",
            is_native: true,
            sort_order: 20,
        },
        {
            id: "module-users",
            slug: "users",
            name: "Usuarios",
            icon: "Users",
            category: "Ajustes",
            is_native: true,
            sort_order: 30,
        },
        {
            id: "module-travel-expenses",
            slug: "travel-expenses",
            name: "Viaticos",
            icon: "Map",
            category: "Finanzas",
            is_native: true,
            sort_order: 54,
        },
        {
            id: "module-payroll",
            slug: "payroll",
            name: "Nómina",
            icon: "DollarSign",
            category: "Finanzas",
            is_native: true,
            sort_order: 52,
        },
    ];

    const roleRates: DemoRoleRate[] = [
        {
            id: "rr-001",
            org_id: ORG.id,
            role: "INVIGILATOR",
            exam_type: null,
            rate_per_hour: 150,
            effective_from: "2024-01-01",
            effective_to: null,
            notes: null,
        },
        {
            id: "rr-002",
            org_id: ORG.id,
            role: "EVALUATOR",
            exam_type: "FCE",
            rate_per_hour: 220,
            effective_from: "2024-01-01",
            effective_to: null,
            notes: null,
        },
    ];

    const travelReports: DemoTravelReport[] = [
        {
            id: "report-001",
            org_id: ORG.id,
            payroll_period_id: null,
            employee_name: "Demo Admin",
            destination: "CDMX",
            trip_purpose: "Evento UNAM",
            start_date: dateOnly(1),
            end_date: dateOnly(3),
            amount_requested: 2500,
            amount_approved: null,
            status: "pending",
            approval_notes: null,
            approved_by: null,
            approved_at: null,
            created_by: "user-001",
            updated_by: "user-001",
            created_at: isoDate(),
            updated_at: isoDate(),
        }
    ];

    const travelReceipts: DemoTravelReceipt[] = [];

    const pmProjects: DemoPmProject[] = [
        {
            id: "pm-project-001",
            org_id: ORG.id,
            key: "OPS",
            name: "Operación PM Demo",
            description: "Proyecto demo para smoke testing",
            status: "active",
            created_at: isoDate(-2),
            updated_at: isoDate(-2),
        },
    ];

    const pmBoards: DemoPmBoard[] = [
        {
            id: "pm-board-001",
            org_id: ORG.id,
            project_id: "pm-project-001",
            name: "Operación PM Demo Board",
            default_view: "kanban",
        },
    ];

    const pmColumns: DemoPmColumn[] = [
        { id: "pm-col-todo", org_id: ORG.id, board_id: "pm-board-001", name: "To Do", slug: "todo", sort_order: 10, is_done: false },
        { id: "pm-col-doing", org_id: ORG.id, board_id: "pm-board-001", name: "Doing", slug: "doing", sort_order: 20, is_done: false },
        { id: "pm-col-done", org_id: ORG.id, board_id: "pm-board-001", name: "Done", slug: "done", sort_order: 30, is_done: true },
    ];

    const pmTasks: DemoPmTask[] = [];

    return {
        categories,
        categoryMap,
        month,
        year,
        movements,
        budgets,
        poaLines,
        invitations,
        members,
        modules,
        travelReports,
        travelReceipts,
        roleRates,
        pmProjects,
        pmBoards,
        pmColumns,
        pmTasks,
        hrProfiles,
        orgLocations,
    };
}

function getBalance(movements: DemoMovement[]) {
    return movements.reduce((total, movement) => {
        return movement.type === "INCOME"
            ? total + movement.amount
            : total - movement.amount;
    }, 0);
}

function getComparative(
    categories: DemoCategory[],
    budgets: DemoBudget[],
    movements: DemoMovement[],
    month: number,
    year: number
) {
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;

    return categories.map((category) => {
        const budgeted =
            budgets.find(
                (budget) =>
                    budget.category_id === category.id &&
                    budget.month === month &&
                    budget.year === year
            )?.amount ?? 0;

        const actual = movements
            .filter(
                (movement) =>
                    movement.category_id === category.id &&
                    movement.type === "EXPENSE" &&
                    movement.date.startsWith(monthPrefix)
            )
            .reduce((sum, movement) => sum + movement.amount, 0);

        const variation = budgeted - actual;
        const variationPct = budgeted > 0 ? (variation / budgeted) * 100 : 0;

        return {
            category_id: category.id,
            category_name: category.name,
            category_slug: category.slug,
            budgeted,
            actual,
            variation,
            variation_pct: variationPct,
        };
    });
}

export async function installDemoApiMocks(page: Page) {
    const state = createDemoState();

    await page.route("**/api/v1/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const pathname = url.pathname;
        const method = request.method();

        if (matchesPath(pathname, "/api/v1/settings")) {
            if (method === "GET") {
                return json(route, { locale: "es-MX", theme: "system" });
            }

            if (method === "PUT") {
                return json(route, { success: true });
            }
        }

        if (matchesPath(pathname, "/api/v1/notifications")) {
            if (method === "GET") {
                return json(route, {
                    notifications: [],
                    unread_count: 0,
                    total: 0,
                });
            }

            if (method === "PATCH") {
                return json(route, { success: true });
            }
        }

        if (matchesPath(pathname, "/api/v1/users/me") && method === "GET") {
            return json(route, {
                user: {
                    id: "demo-user-001",
                    email: "demo.admin@lec.mx",
                    full_name: "Demo Admin",
                },
                organization: {
                    id: ORG.id,
                    name: ORG.name,
                },
                role: "admin",
                permissions: [],
            });
        }

        if (matchesPath(pathname, "/api/v1/modules") && method === "GET") {
            return json(route, {
                modules: state.modules,
                role: "admin",
            });
        }

        if (matchesPath(pathname, "/api/v1/users")) {
            if (method === "GET") {
                return json(route, { members: state.members });
            }

            if (method === "DELETE") {
                const id = url.searchParams.get("id");
                const index = state.members.findIndex((member) => member.id === id);

                if (index >= 0) {
                    state.members.splice(index, 1);
                }

                return json(route, { success: true });
            }
        }

        if (matchesPath(pathname, "/api/v1/org-locations") && method === "GET") {
            return json(route, { locations: state.orgLocations });
        }

        if (matchesPath(pathname, "/api/v1/hr/profiles") && method === "GET") {
            return json(route, { profiles: state.hrProfiles });
        }

        if (matchesPath(pathname, "/api/v1/invitations")) {
            if (method === "GET") {
                return json(route, { invitations: state.invitations });
            }

            if (method === "POST") {
                const body = parseBody(route) as
                    | {
                          email?: string;
                          role?: DemoInvitation["role"];
                          sendEmail?: boolean;
                          location?: string;
                          job_title?: string;
                          hr_profile_id?: string;
                      }
                    | null;

                if (!body?.email || !body?.role) {
                    return json(route, { error: "Datos invalidos" }, 400);
                }

                const location = body.location?.trim();
                if (!location) {
                    return json(route, { error: "Datos invalidos" }, 400);
                }

                const locOk = state.orgLocations.some((l) => l.is_active && l.name === location);
                if (!locOk) {
                    return json(
                        route,
                        {
                            error: "Sede invalida o inactiva. Debe existir en el catalogo de sedes de tu organizacion.",
                        },
                        400
                    );
                }

                const hasProfile = Boolean(body.hr_profile_id?.trim());
                const hasManual = Boolean(body.job_title?.trim());
                if (!hasProfile && !hasManual) {
                    return json(route, { error: "Datos invalidos" }, 400);
                }

                let jobTitle: string | null = body.job_title?.trim() ? body.job_title.trim() : null;
                const hrPid: string | null = hasProfile ? body.hr_profile_id!.trim() : null;

                if (hrPid) {
                    const profile = state.hrProfiles.find((p) => p.id === hrPid);
                    if (!profile) {
                        return json(
                            route,
                            { error: "Perfil de puesto (RRHH) invalido o no pertenece a tu organizacion." },
                            400
                        );
                    }
                    jobTitle = profile.role_title;
                } else if (!jobTitle) {
                    return json(route, { error: "Rol empresa requerido." }, 400);
                }

                const id = `invite-${Date.now()}`;
                const token = `token-${Date.now()}`;
                const invitation: DemoInvitation = {
                    id,
                    org_id: ORG.id,
                    email: body.email,
                    role: body.role,
                    status: "pending",
                    created_at: isoDate(),
                    token,
                    job_title: jobTitle,
                    location,
                    hr_profile_id: hrPid,
                    invited_by: "demo-user-001",
                    expires_at: isoDate(7),
                };

                state.invitations.unshift(invitation);

                return json(route, {
                    invitation,
                    joinUrl: `http://localhost:3000/join/${token}`,
                    emailSent: body.sendEmail !== false,
                });
            }
        }

        if (/\/api\/v1\/invitations\/[^/]+$/.test(pathname) && method === "PATCH") {
            const id = pathname.split("/").pop();
            const body = parseBody(route) as {
                status?: DemoInvitation["status"];
                job_title?: string;
                hr_profile_id?: string;
                location?: string;
            } | null;
            const invitation = state.invitations.find((item) => item.id === id);

            if (!invitation) {
                return json(route, { error: "Invitacion no encontrada" }, 404);
            }

            if (body == null) {
                return json(route, { error: "Datos invalidos" }, 400);
            }

            const wantsStatus = body.status !== undefined;
            const wantsJob = body.hr_profile_id !== undefined || body.job_title !== undefined;
            const wantsLocation = body.location !== undefined;

            if (!wantsStatus && !wantsJob && !wantsLocation) {
                return json(route, { error: "Nada que actualizar." }, 400);
            }

            if ((wantsJob || wantsLocation) && invitation.status !== "pending") {
                return json(route, { error: "Solo se pueden editar sede o puesto en invitaciones pendientes." }, 400);
            }

            if (wantsLocation) {
                const location = body.location?.trim();
                if (!location) {
                    return json(route, { error: "Datos invalidos" }, 400);
                }
                const locOk = state.orgLocations.some((l) => l.is_active && l.name === location);
                if (!locOk) {
                    return json(
                        route,
                        {
                            error: "Sede invalida o inactiva. Debe existir en el catalogo de sedes de tu organizacion.",
                        },
                        400
                    );
                }
                invitation.location = location;
            }

            if (wantsJob) {
                const hrKey = body.hr_profile_id;
                const hasProfile = Boolean(hrKey && hrKey !== "__custom__");
                if (hasProfile) {
                    const profile = state.hrProfiles.find((p) => p.id === hrKey);
                    if (!profile) {
                        return json(
                            route,
                            { error: "Perfil de puesto (RRHH) invalido o no pertenece a tu organizacion." },
                            400
                        );
                    }
                    invitation.hr_profile_id = profile.id;
                    invitation.job_title = profile.role_title;
                } else {
                    const title = body.job_title?.trim();
                    if (!title) {
                        return json(route, { error: "Rol empresa requerido." }, 400);
                    }
                    invitation.hr_profile_id = null;
                    invitation.job_title = title;
                }
            }

            if (wantsStatus) {
                invitation.status = body.status!;
            }

            return json(route, { invitation });
        }

        if (/\/api\/v1\/invitations\/[^/]+\/resend$/.test(pathname) && method === "POST") {
            const id = pathname.split("/").slice(-2)[0];
            const invitation = state.invitations.find((item) => item.id === id);

            if (!invitation) {
                return json(route, { error: "Invitacion no encontrada" }, 404);
            }

            return json(route, {
                joinUrl: `http://localhost:3000/join/${invitation.token}`,
                emailSent: true,
            });
        }

        if (matchesPath(pathname, "/api/v1/finance/petty-cash/categories") && method === "GET") {
            return json(route, {
                categories: state.categories.map((category, index) => ({
                    ...category,
                    is_active: true,
                    sort_order: index,
                })),
            });
        }

        if (matchesPath(pathname, "/api/v1/finance/petty-cash/balance") && method === "GET") {
            return json(route, { balance: getBalance(state.movements) });
        }

        if (matchesPath(pathname, "/api/v1/finance/petty-cash")) {
            if (method === "GET") {
                const search = (url.searchParams.get("search") ?? "").toLowerCase();
                const categoryId = url.searchParams.get("category_id");
                const type = url.searchParams.get("type");

                const movements = state.movements.filter((movement) => {
                    if (search && !movement.concept.toLowerCase().includes(search)) {
                        return false;
                    }

                    if (categoryId && movement.category_id !== categoryId) {
                        return false;
                    }

                    if (type && movement.type !== type) {
                        return false;
                    }

                    return true;
                });

                return json(route, {
                    movements,
                    pagination: {
                        total: movements.length,
                        page: 1,
                        limit: 50,
                        pages: 1,
                    },
                });
            }

            if (method === "POST") {
                const body = parseBody(route) as
                    | {
                        category_id?: string;
                        date?: string;
                        concept?: string;
                        type?: "INCOME" | "EXPENSE";
                        amount?: number;
                        notes?: string | null;
                    }
                    | null;

                if (
                    !body?.category_id ||
                    !body.date ||
                    !body.concept ||
                    !body.type ||
                    typeof body.amount !== "number"
                ) {
                    return json(route, { error: "Validation failed" }, 400);
                }

                const category = state.categoryMap.get(body.category_id);
                if (!category) {
                    return json(route, { error: "Categoria invalida" }, 400);
                }

                const movement: DemoMovement = {
                    id: `mov-${Date.now()}`,
                    org_id: ORG.id,
                    category_id: body.category_id,
                    date: body.date,
                    concept: body.concept,
                    type: body.type,
                    amount: body.amount,
                    notes: body.notes ?? null,
                    petty_cash_categories: {
                        name: category.name,
                        slug: category.slug,
                    },
                    organizations: {
                        name: ORG.name,
                        slug: ORG.slug,
                    },
                };

                state.movements.unshift(movement);

                return json(route, { movement }, 201);
            }
        }

        if (matchesPath(pathname, "/api/v1/finance/budget")) {
            if (method === "GET") {
                const month = Number(url.searchParams.get("month") ?? state.month);
                const year = Number(url.searchParams.get("year") ?? state.year);

                const budgets = state.budgets.filter(
                    (budget) => budget.month === month && budget.year === year
                );

                return json(route, { budgets });
            }

            if (method === "POST") {
                const body = parseBody(route) as
                    | Array<{
                        category_id: string;
                        month: number;
                        year: number;
                        amount: number;
                    }>
                    | null;

                if (!Array.isArray(body)) {
                    return json(route, { error: "Validation failed" }, 400);
                }

                for (const entry of body) {
                    const category = state.categoryMap.get(entry.category_id);
                    if (!category) continue;

                    const existing = state.budgets.find(
                        (budget) =>
                            budget.category_id === entry.category_id &&
                            budget.month === entry.month &&
                            budget.year === entry.year
                    );

                    if (existing) {
                        existing.amount = entry.amount;
                    } else {
                        state.budgets.push({
                            id: `budget-${Date.now()}-${entry.category_id}`,
                            org_id: ORG.id,
                            category_id: entry.category_id,
                            month: entry.month,
                            year: entry.year,
                            amount: entry.amount,
                            petty_cash_categories: {
                                name: category.name,
                                slug: category.slug,
                            },
                        });
                    }
                }

                return json(route, { budgets: state.budgets });
            }
        }

        if (matchesPath(pathname, "/api/v1/finance/budget/comparative") && method === "GET") {
            const month = Number(url.searchParams.get("month") ?? state.month);
            const year = Number(url.searchParams.get("year") ?? state.year);

            return json(route, {
                comparative: getComparative(
                    state.categories,
                    state.budgets,
                    state.movements,
                    month,
                    year
                ),
            });
        }

        if (matchesPath(pathname, "/api/v1/finance/poa") && method === "GET") {
            const year = Number(url.searchParams.get("year") ?? state.year);
            const source = (url.searchParams.get("source") ?? "CAJA_CHICA") as "CAJA_CHICA" | "CUENTA_BAC";
            const lines = state.poaLines.filter((line) => line.year === year && line.source === source);

            const grouped: Record<string, Record<string, Record<number, DemoPoaLine>>> = {};
            for (const line of lines) {
                if (!grouped[line.section]) grouped[line.section] = {};
                if (!grouped[line.section][line.concept]) grouped[line.section][line.concept] = {};
                grouped[line.section][line.concept][line.month] = line;
            }

            return json(route, { lines, grouped });
        }

        if (matchesPath(pathname, "/api/v1/finance/poa") && method === "POST") {
            const body = parseBody(route) as Array<Omit<DemoPoaLine, "id" | "org_id" | "notes">> | null;
            if (!Array.isArray(body)) {
                return json(route, { error: "Validation failed" }, 400);
            }

            for (const entry of body) {
                const existing = state.poaLines.find(
                    (line) =>
                        line.year === entry.year &&
                        line.month === entry.month &&
                        line.source === entry.source &&
                        line.section === entry.section &&
                        line.concept === entry.concept
                );

                if (existing) {
                    existing.budgeted_amount = entry.budgeted_amount;
                    existing.real_amount = entry.real_amount ?? null;
                    existing.sort_order = entry.sort_order;
                } else {
                    state.poaLines.push({
                        id: `poa-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                        org_id: ORG.id,
                        year: entry.year,
                        month: entry.month,
                        source: entry.source,
                        section: entry.section,
                        concept: entry.concept,
                        budgeted_amount: entry.budgeted_amount,
                        real_amount: entry.real_amount ?? null,
                        notes: null,
                        sort_order: entry.sort_order,
                    });
                }
            }

            return json(route, { lines: state.poaLines });
        }

        if (/\/api\/v1\/finance\/poa\/[^/]+$/.test(pathname) && method === "DELETE") {
            const id = pathname.split("/").pop();
            const index = state.poaLines.findIndex((line) => line.id === id);
            if (index >= 0) {
                state.poaLines.splice(index, 1);
            }
            return json(route, { success: true });
        }

        if (matchesPath(pathname, "/api/v1/finance/travel-expenses")) {
            if (method === "GET") {
                const status = url.searchParams.get("status");
                const year = url.searchParams.get("year");

                let filtered = [...state.travelReports];
                if (status && status !== "all") {
                    filtered = filtered.filter((r) => r.status === status);
                }
                if (year) {
                    filtered = filtered.filter((r) => r.start_date.startsWith(year));
                }

                const hydrated = filtered.map((report) => {
                    const receipts = state.travelReceipts.filter((rc) => rc.report_id === report.id);
                    const receiptsTotal = receipts.reduce((sum, rc) => sum + (rc.amount || 0), 0);
                    return {
                        ...report,
                        receipts,
                        receipts_total: receiptsTotal,
                        payroll_period_name: null, // Simplified for mock
                    };
                });

                const summary = {
                    total_reports: hydrated.length,
                    pending_count: hydrated.filter((r) => r.status === "pending").length,
                    approved_count: hydrated.filter((r) => r.status === "approved").length,
                    reimbursed_count: hydrated.filter((r) => r.status === "reimbursed").length,
                    requested_total: hydrated.reduce((sum, r) => sum + r.amount_requested, 0),
                    approved_total: hydrated.reduce((sum, r) => sum + (r.amount_approved || 0), 0),
                    receipts_total: hydrated.reduce((sum, r) => sum + (r.receipts_total || 0), 0),
                };

                return json(route, { reports: hydrated, summary });
            }

            if (method === "POST") {
                const body = parseBody(route) as any;
                const report: DemoTravelReport = {
                    id: `report-${Date.now()}`,
                    org_id: ORG.id,
                    payroll_period_id: body.payroll_period_id || null,
                    employee_name: body.employee_name,
                    destination: body.destination,
                    trip_purpose: body.trip_purpose,
                    start_date: body.start_date,
                    end_date: body.end_date,
                    amount_requested: body.amount_requested,
                    amount_approved: null,
                    status: "pending",
                    approval_notes: null,
                    approved_by: null,
                    approved_at: null,
                    created_by: "user-001",
                    updated_by: "user-001",
                    created_at: isoDate(),
                    updated_at: isoDate(),
                };
                state.travelReports.unshift(report);
                return json(route, { report: { ...report, receipts: [], receipts_total: 0 } }, 201);
            }
        }

        if (/\/api\/v1\/finance\/travel-expenses\/[^/]+$/.test(pathname)) {
            const id = pathname.split("/").pop();
            const report = state.travelReports.find((r) => r.id === id);

            if (!report) {
                return json(route, { error: "Report not found" }, 404);
            }

            if (method === "PATCH") {
                const body = parseBody(route) as any;
                Object.assign(report, {
                    ...body,
                    updated_at: isoDate(),
                    updated_by: "user-001",
                });
                if (body.status === "approved") {
                    report.approved_by = "user-001";
                    report.approved_at = isoDate();
                }
                return json(route, { report });
            }
        }

        if (/\/api\/v1\/finance\/travel-expenses\/[^/]+\/receipts$/.test(pathname)) {
            const reportId = pathname.split("/").slice(-2)[0];
            if (method === "POST") {
                const body = parseBody(route) as any;
                const receipt: DemoTravelReceipt = {
                    id: `receipt-${Date.now()}`,
                    org_id: ORG.id,
                    report_id: reportId,
                    file_name: body.file_name,
                    file_type: body.file_type,
                    file_url: body.file_url,
                    amount: body.amount || null,
                    notes: body.notes || null,
                    uploaded_by: "user-001",
                    created_at: isoDate(),
                    updated_at: isoDate(),
                };
                state.travelReceipts.push(receipt);
                return json(route, { receipt }, 201);
            }
        }

        if (matchesPath(pathname, "/api/v1/settings/role-rates")) {
            if (method === "GET") {
                return json(route, { rates: state.roleRates });
            }

            if (method === "POST") {
                const body = parseBody(route) as {
                    role?: string;
                    exam_type?: string | null;
                    rate_per_hour?: number;
                    effective_from?: string;
                } | null;

                if (!body?.role || typeof body.rate_per_hour !== "number") {
                    return json(route, { error: "Validación fallida" }, 400);
                }

                const id = `rr-${Date.now()}`;
                const row: DemoRoleRate = {
                    id,
                    org_id: ORG.id,
                    role: body.role,
                    exam_type: body.exam_type?.trim() ? body.exam_type.trim() : null,
                    rate_per_hour: body.rate_per_hour,
                    effective_from: body.effective_from?.slice(0, 10) || dateOnly(0),
                    effective_to: null,
                    notes: null,
                };
                state.roleRates.push(row);
                return json(route, { rate: row }, 201);
            }
        }

        if (/^\/api\/v1\/settings\/role-rates\/[^/]+$/.test(pathname)) {
            const id = pathname.split("/").pop() ?? "";
            if (method === "PATCH") {
                const body = parseBody(route) as Partial<DemoRoleRate> | null;
                const idx = state.roleRates.findIndex((r) => r.id === id);
                if (idx < 0) {
                    return json(route, { error: "No encontrado" }, 404);
                }
                if (body && typeof body.rate_per_hour === "number") {
                    state.roleRates[idx].rate_per_hour = body.rate_per_hour;
                }
                return json(route, { rate: state.roleRates[idx] });
            }

            if (method === "DELETE") {
                const idx = state.roleRates.findIndex((r) => r.id === id);
                if (idx < 0) {
                    return json(route, { error: "No encontrado" }, 404);
                }
                state.roleRates.splice(idx, 1);
                return json(route, { success: true });
            }
        }

        if (matchesPath(pathname, "/api/v1/portal/magic-link") && method === "POST") {
            return json(route, {
                ok: true,
                message: "Revisa tu correo para el enlace de acceso.",
            });
        }

        if (matchesPath(pathname, "/api/v1/pm/projects")) {
            if (method === "GET") {
                const q = (url.searchParams.get("q") ?? "").toLowerCase();
                const projects = state.pmProjects.filter((project) =>
                    !q ||
                    project.name.toLowerCase().includes(q) ||
                    (project.key ?? "").toLowerCase().includes(q) ||
                    (project.description ?? "").toLowerCase().includes(q)
                );
                return json(route, { projects, total: projects.length });
            }

            if (method === "POST") {
                const body = parseBody(route) as { key?: string | null; name?: string; description?: string | null } | null;
                if (!body?.name?.trim()) {
                    return json(route, { error: "Validation failed" }, 400);
                }

                const projectId = `pm-project-${Date.now()}`;
                const boardId = `pm-board-${Date.now()}`;
                const key = body.key?.trim() ? body.key.trim().toUpperCase().replace(/\s+/g, "-") : null;
                const now = isoDate();

                const project: DemoPmProject = {
                    id: projectId,
                    org_id: ORG.id,
                    key,
                    name: body.name.trim(),
                    description: body.description?.trim() || null,
                    status: "active",
                    created_at: now,
                    updated_at: now,
                };
                state.pmProjects.unshift(project);

                const board: DemoPmBoard = {
                    id: boardId,
                    org_id: ORG.id,
                    project_id: projectId,
                    name: `${project.name} Board`,
                    default_view: "kanban",
                };
                state.pmBoards.push(board);

                state.pmColumns.push(
                    { id: `${boardId}-todo`, org_id: ORG.id, board_id: boardId, name: "To Do", slug: "todo", sort_order: 10, is_done: false },
                    { id: `${boardId}-doing`, org_id: ORG.id, board_id: boardId, name: "Doing", slug: "doing", sort_order: 20, is_done: false },
                    { id: `${boardId}-done`, org_id: ORG.id, board_id: boardId, name: "Done", slug: "done", sort_order: 30, is_done: true }
                );

                return json(route, { project, board }, 201);
            }
        }

        if (matchesPath(pathname, "/api/v1/pm/tasks")) {
            if (method === "GET") {
                const projectId = url.searchParams.get("project_id");
                const boardId = url.searchParams.get("board_id");
                const tasks = state.pmTasks.filter((task) => {
                    if (projectId && task.project_id !== projectId) return false;
                    if (boardId && task.board_id !== boardId) return false;
                    return true;
                });
                return json(route, { tasks, total: tasks.length });
            }

            if (method === "POST") {
                const body = parseBody(route) as {
                    project_id?: string;
                    board_id?: string;
                    column_id?: string;
                    title?: string;
                    description?: string | null;
                    priority?: "low" | "normal" | "high" | "urgent";
                } | null;

                if (!body?.project_id || !body?.board_id || !body?.column_id || !body?.title?.trim()) {
                    return json(route, { error: "Validation failed" }, 400);
                }

                const column = state.pmColumns.find((item) => item.id === body.column_id && item.board_id === body.board_id);
                if (!column) {
                    return json(route, { error: "Invalid column_id for this organization." }, 400);
                }

                const task: DemoPmTask = {
                    id: `pm-task-${Date.now()}`,
                    org_id: ORG.id,
                    project_id: body.project_id,
                    board_id: body.board_id,
                    column_id: body.column_id,
                    ref: null,
                    title: body.title.trim(),
                    description: body.description?.trim() || null,
                    priority: body.priority || "normal",
                    sort_order: 1000,
                    created_at: isoDate(),
                    updated_at: isoDate(),
                    completed_at: column.is_done ? isoDate() : null,
                };
                state.pmTasks.push(task);
                return json(route, { task }, 201);
            }
        }

        if (/\/api\/v1\/pm\/tasks\/[^/]+\/move$/.test(pathname) && method === "POST") {
            const id = pathname.split("/").slice(-2)[0];
            const body = parseBody(route) as { column_id?: string; sort_order?: number } | null;
            const task = state.pmTasks.find((item) => item.id === id);
            if (!task || !body?.column_id) {
                return json(route, { error: "Task not found" }, 404);
            }
            const target = state.pmColumns.find((item) => item.id === body.column_id);
            if (!target) {
                return json(route, { error: "Invalid column_id for this organization." }, 400);
            }
            task.column_id = target.id;
            task.board_id = target.board_id;
            task.sort_order = body.sort_order ?? task.sort_order;
            task.completed_at = target.is_done ? isoDate() : null;
            task.updated_at = isoDate();
            return json(route, { task });
        }

        return route.continue();
    });
}
