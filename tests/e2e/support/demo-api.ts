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

type DemoInvitation = {
    id: string;
    org_id: string;
    email: string;
    role: "admin" | "supervisor" | "operador" | "applicator";
    status: "pending" | "accepted" | "expired" | "revoked";
    created_at: string;
    token: string;
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

const ORG = {
    id: "demo-org-001",
    name: "LEC Demo",
    slug: "lec-demo",
};

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

    const invitations: DemoInvitation[] = [
        {
            id: "invite-001",
            org_id: ORG.id,
            email: "pendiente@lec.mx",
            role: "supervisor",
            status: "pending",
            created_at: isoDate(-1),
            token: "token-pending-001",
        },
        {
            id: "invite-002",
            org_id: ORG.id,
            email: "expirada@lec.mx",
            role: "operador",
            status: "expired",
            created_at: isoDate(-5),
            token: "token-expired-002",
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
    ];

    return {
        categories,
        categoryMap,
        month,
        year,
        movements,
        budgets,
        invitations,
        members,
        modules,
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

        if (matchesPath(pathname, "/api/v1/invitations")) {
            if (method === "GET") {
                return json(route, { invitations: state.invitations });
            }

            if (method === "POST") {
                const body = parseBody(route) as
                    | { email?: string; role?: DemoInvitation["role"]; sendEmail?: boolean }
                    | null;

                if (!body?.email || !body?.role) {
                    return json(route, { error: "Datos invalidos" }, 400);
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
            const body = parseBody(route) as { status?: DemoInvitation["status"] } | null;
            const invitation = state.invitations.find((item) => item.id === id);

            if (!invitation || !body?.status) {
                return json(route, { error: "Invitacion no encontrada" }, 404);
            }

            invitation.status = body.status;
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

        return route.continue();
    });
}
