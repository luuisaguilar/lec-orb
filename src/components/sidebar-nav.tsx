"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import {
    ChevronDown,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getIcon } from "@/lib/icon-registry";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ModuleRegistryEntry {
    id: string;
    slug: string;
    name: string;
    icon: string;
    category: string | null;
    is_native: boolean;
    sort_order: number;
}

interface NavItem {
    label: string;
    href: string;
    icon: string;
    module: string;
}

interface NavGroup {
    label: string | null;
    icon: string;
    items: NavItem[];
}

const GLOBAL_PROJECTS_ITEM: NavItem = {
    label: "Proyectos (Empresa)",
    href: "/dashboard/proyectos-global",
    icon: "Kanban",
    module: "project-management",
};

// ─────────────────────────────────────────────────────────────────────────────
// Native module → route mapping
// Maps a module slug to its actual Next.js route path.
// Custom modules (is_native=false) always go to /dashboard/m/[slug].
// ─────────────────────────────────────────────────────────────────────────────
const NATIVE_ROUTES: Record<string, string> = {
    "dashboard": "/dashboard",
    "schools": "/dashboard/schools",
    "applicators": "/dashboard/applicators",
    "events": "/dashboard/eventos",
    "project-management": "/dashboard/proyectos",
    "toefl": "/dashboard/toefl/administraciones",
    "toefl-codes": "/dashboard/toefl/codigos",
    "cenni": "/dashboard/cenni",
    "exam-codes": "/dashboard/codigos",
    "calculator": "/dashboard/calculadora-tiempos",
    "catalog": "/dashboard/catalogo",
    "suppliers": "/dashboard/proveedores",
    "quotes": "/dashboard/cotizaciones",
    "purchase-orders": "/dashboard/ordenes",
    "payments": "/dashboard/pagos",
    "payroll": "/dashboard/nomina",
    "rrhh": "/dashboard/rrhh",
    "sgc": "/dashboard/sgc",
    "petty-cash": "/dashboard/finanzas/caja-chica",
    "budget": "/dashboard/finanzas/presupuesto",
    "ih-billing": "/dashboard/finanzas/ih-billing",
    "travel-expenses": "/dashboard/finanzas/viaticos",
    "users": "/dashboard/users",
    "audit-log": "/dashboard/actividad",
    "documentos": "/dashboard/documentos",
    "courses": "/dashboard/academico/cursos",
    "inventory": "/dashboard/logistica/inventario",
    "speaking-packs": "/dashboard/toefl/speaking-packs",
    "unoi-planning": "/dashboard/logistica/unoi-planeacion",
    "event-documents": "/dashboard/coordinacion-examenes/documentos-eventos",
};

// ─────────────────────────────────────────────────────────────────────────────
// Category group icon — shown on the collapsible parent
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
    "Coordinación de Exámenes": "Building2",
    "Institucional": "Building2",
    "Inventario": "Package",
    "Exámenes": "GraduationCap",
    "Catálogos": "BookOpen",
    "Finanzas": "DollarSign",
    "Ajustes": "UserCog",
    "Académico": "GraduationCap",
    "Logística": "Truck",
};

async function navFetcher(url: string) {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return { __error: true as const, status: res.status, ...data };
    }
    return data;
}

const MODULE_PERMISSION_ALIAS: Record<string, string> = {
    "travel-expenses": "finanzas",
    "event-documents": "documents",
};

// ─────────────────────────────────────────────────────────────────────────────
// Portal nav (static — no module registry needed for applicator portal)
// ─────────────────────────────────────────────────────────────────────────────
const PORTAL_ITEMS: NavItem[] = [
    { label: "Portal", href: "/portal", icon: "BarChart3", module: "inventory" },
    { label: "Mis eventos", href: "/portal/eventos", icon: "ClipboardList", module: "events" },
    { label: "Horarios", href: "/portal/horarios", icon: "Calendar", module: "events" },
    { label: "Nómina", href: "/portal/nomina", icon: "DollarSign", module: "payroll" },
    { label: "Métricas", href: "/portal/metricas", icon: "BarChart3", module: "dashboard" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SidebarNav
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarNavProps {
    variant: "dashboard" | "portal";
    className?: string;
    isCollapsed?: boolean;
}

export function SidebarNav({ variant, className, isCollapsed }: SidebarNavProps) {
    const pathname = usePathname();

    // User data (permissions, role) — existing SWR call
    const { data: userData, isLoading: userLoading } = useSWR(
        variant === "dashboard" ? "/api/v1/users/me" : null,
        navFetcher
    );

    // Module registry — new SWR call
    const { data: modulesData, isLoading: modulesLoading } = useSWR(
        variant === "dashboard" ? "/api/v1/modules" : null,
        navFetcher
    );

    const isLoading = userLoading || modulesLoading;

    // ── Build navigation groups from module_registry ──────────────────────────
    const navGroups = useMemo<NavGroup[]>(() => {
        if (variant === "portal") {
            // Portal stays static and independent from org_members profile checks.
            return [{
                label: null,
                icon: "BarChart3",
                items: PORTAL_ITEMS,
            }];
        }

        if (!userData || (userData as { __error?: boolean }).__error) {
            return [];
        }
        if (!(userData as { user?: unknown }).user) {
            return [];
        }

        if (
            !modulesData ||
            (modulesData as { __error?: boolean }).__error ||
            !Array.isArray((modulesData as { modules?: unknown }).modules)
        ) {
            return [];
        }

        const modules: ModuleRegistryEntry[] = (modulesData as { modules: ModuleRegistryEntry[] }).modules ?? [];
        const perms: any[] = userData.permissions ?? [];
        const isAdmin = userData.role === "admin";

        // Permission check for native modules (uses existing SWR /users/me data)
        const canViewModule = (slug: string): boolean => {
            if (isAdmin) return true;
            if (slug === "dashboard" || slug === "audit-log") return true;
            if (slug === "catalog") return true; // always readable
            const permissionSlug = MODULE_PERMISSION_ALIAS[slug] ?? slug;
            const perm = perms.find((p) => p.module === permissionSlug);
            return perm?.can_view ?? false;
        };

        const canViewGlobalProjects = canViewModule("project-management");

        // Group by category
        const grouped: Record<string, ModuleRegistryEntry[]> = {};
        const topLevel: ModuleRegistryEntry[] = [];

        for (const mod of modules) {
            // Access check
            if (mod.is_native && !canViewModule(mod.slug)) continue;
            // (Custom modules are already filtered server-side by /api/v1/modules)

            if (!mod.category) {
                topLevel.push(mod);
            } else {
                if (!grouped[mod.category]) grouped[mod.category] = [];
                grouped[mod.category].push(mod);
            }
        }

        const result: NavGroup[] = [];

        // Top-level items (e.g. Dashboard — no category)
        for (const mod of topLevel) {
            const href = NATIVE_ROUTES[mod.slug] ?? `/dashboard/m/${mod.slug}`;
            result.push({
                label: null,
                icon: mod.icon,
                items: [{ label: mod.name, href, icon: mod.icon, module: mod.slug }],
            });
        }

        // Category groups
        const orderedCategories = [
            "Coordinación de Exámenes",
            "Institucional", 
            "Inventario", 
            "Exámenes", 
            "Académico",
            "Logística",
            "Catálogos", 
            "Finanzas", 
            "Ajustes",
        ];
        const allCategories = [
            ...orderedCategories,
            ...Object.keys(grouped).filter((c) => !orderedCategories.includes(c)),
        ];

        for (const category of allCategories) {
            const mods = grouped[category];
            if (!mods || mods.length === 0) continue;

            const items: NavItem[] = mods.map((mod) => {
                if ((category === "Coordinación de Exámenes" || category === "Institucional") && mod.slug === "project-management") {
                    return {
                        label: "Proyectos (Coordinación)",
                        href: "/dashboard/coordinacion-examenes/proyectos",
                        icon: mod.icon,
                        module: mod.slug,
                    };
                }
                const href = NATIVE_ROUTES[mod.slug] ?? `/dashboard/m/${mod.slug}`;
                return { label: mod.name, href, icon: mod.icon, module: mod.slug };
            });

            result.push({
                label: category,
                icon: CATEGORY_ICONS[category] ?? "Layers",
                items,
            });
        }

        if (canViewGlobalProjects) {
            const globalGroup: NavGroup = {
                label: null,
                icon: GLOBAL_PROJECTS_ITEM.icon,
                items: [GLOBAL_PROJECTS_ITEM],
            };
            const coordinationIndex = result.findIndex(
                (group) => group.label === "Coordinación de Exámenes" || group.label === "Institucional"
            );
            if (coordinationIndex >= 0) {
                result.splice(coordinationIndex + 1, 0, globalGroup);
            } else {
                result.push(globalGroup);
            }
        }

        return result;
    }, [userData, modulesData, variant]);

    // ── Loading state ──────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex h-10 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const userPayload = userData as
        | { __error?: boolean; status?: number; error?: string; user?: { id?: string } }
        | undefined;
    const modulesPayload = modulesData as
        | { __error?: boolean; status?: number; error?: string; modules?: ModuleRegistryEntry[] }
        | undefined;

    if (variant === "dashboard" && (userPayload?.__error || !userPayload?.user)) {
        const noOrg =
            userPayload?.status === 403 || userPayload?.error === "No organization found";
        return (
            <div
                className={cn(
                    "rounded-lg border p-3 text-xs leading-relaxed text-foreground",
                    noOrg ? "border-amber-200 bg-amber-50" : "border-destructive/30 bg-destructive/5"
                )}
            >
                <p className="font-semibold">
                    {noOrg ? "Cuenta sin organización" : "No se pudo cargar tu perfil"}
                </p>
                {noOrg ? (
                    <p className="mt-2 text-muted-foreground">
                        Si venías de una invitación: abre el enlace del correo, inicia sesión con el{" "}
                        <strong>mismo email</strong> invitado y pulsa <strong>Aceptar</strong> en la
                        pantalla de unión.
                    </p>
                ) : (
                    <p className="mt-2 text-muted-foreground">Vuelve a iniciar sesión o recarga la página.</p>
                )}
                <Link href="/login" className="mt-3 inline-block font-medium text-primary hover:underline">
                    Ir a iniciar sesión
                </Link>
            </div>
        );
    }

    if (variant === "dashboard" && modulesPayload?.__error) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-foreground">No se pudo cargar el menú</p>
                <p className="mt-2 text-muted-foreground">Recarga la página. Si continúa, avisa a soporte.</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <ScrollArea className={cn("h-full min-h-0", className)}>
            <nav className="flex flex-col gap-1 pr-3">
                {navGroups.map((group, idx) => {
                    const GroupIcon = getIcon(group.icon);

                    // Single item with no category label — renders as a direct Link
                    if (!group.label && group.items.length === 1) {
                        const item = group.items[0];
                        const ItemIcon = getIcon(item.icon);
                        const isActive =
                            item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={isCollapsed ? item.label : undefined}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all",
                                    isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-3",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground"
                                )}
                            >
                                <ItemIcon className={cn(
                                    "shrink-0 transition-transform duration-300",
                                    isCollapsed ? "h-5 w-5" : "h-4 w-4",
                                    "group-hover:scale-125 group-hover:rotate-6",
                                    isActive && "animate-pulse-once",
                                )} />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                            </Link>
                        );
                    }

                    // Group with collapsible children
                    const isAnyChildActive = group.items.some((i) =>
                        i.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname === i.href || pathname.startsWith(`${i.href}/`)
                    );

                    return (
                        <Collapsible key={`${group.label}-${idx}`} defaultOpen={isAnyChildActive} className="w-full">
                            <CollapsibleTrigger asChild>
                                <button
                                    title={isCollapsed ? (group.label ?? group.items[0]?.label) : undefined}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg py-2 text-sm font-medium transition-all group",
                                        isCollapsed ? "px-0 h-10 w-10 mx-auto justify-center" : "px-3 gap-3",
                                        "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                                        isAnyChildActive && "text-foreground font-semibold"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <GroupIcon className={cn(
                                            "shrink-0 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6",
                                            isCollapsed ? "h-5 w-5" : "h-4 w-4",
                                        )} />
                                        {!isCollapsed && (
                                            <span className="truncate">{group.label ?? group.items[0]?.label}</span>
                                        )}
                                    </div>
                                    {!isCollapsed && (
                                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    )}
                                </button>
                            </CollapsibleTrigger>

                            {!isCollapsed && (
                                <CollapsibleContent className="space-y-1 px-3 pt-1 pb-2">
                                    {group.items.map((item) => {
                                        const SubIcon = getIcon(item.icon);
                                        const isActive =
                                            item.href === "/dashboard"
                                                ? pathname === "/dashboard"
                                                : pathname === item.href || pathname.startsWith(`${item.href}/`);

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "group/sub flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                                    "hover:bg-accent hover:text-accent-foreground",
                                                    isActive
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                <SubIcon className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/sub:scale-125 group-hover/sub:rotate-6" />
                                                <span className="truncate">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </CollapsibleContent>
                            )}
                        </Collapsible>
                    );
                })}
            </nav>
        </ScrollArea>
    );
}
