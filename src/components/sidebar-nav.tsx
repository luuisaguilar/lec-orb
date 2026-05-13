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

/** Second level under a category (e.g. "TOEFL" or nested "Cambridge" → "Sistema Uno"). */
interface NavSubgroup {
    label: string;
    icon: string;
    /** Leaf links when this row is a single collapsible (e.g. TOEFL). */
    items?: NavItem[];
    /** Extra nesting: e.g. Cambridge → Sistema Uno → links. */
    children?: NavSubgroup[];
}

interface NavGroup {
    label: string | null;
    icon: string;
    items: NavItem[];
    /** When set (Coordinación de Exámenes), render nested collapsibles instead of a flat list. */
    subgroups?: NavSubgroup[];
}

/** Spanish A→Z (letra por letra); `numeric` pone “2” antes que “10”. */
const SIDEBAR_LABEL_COLLATOR = new Intl.Collator("es", { sensitivity: "base", numeric: true });

function compareSidebarLabels(a: string, b: string): number {
    return SIDEBAR_LABEL_COLLATOR.compare(a.trim(), b.trim());
}

/** Title used to interleave “solo módulo” rows with category blocks (A→Z). */
function navGroupSortKey(g: NavGroup): string {
    if (g.label != null && g.label !== "") return g.label;
    if (g.items.length >= 1) return g.items[0]?.label ?? "";
    return "";
}

/** Sidebar module order: strict alphabetical by visible label. */
function sortNavItemsAlphabetical(items: NavItem[]): NavItem[] {
    return [...items].sort((a, b) => compareSidebarLabels(a.label, b.label));
}

/** Sort leaf links inside each Coordinación subgroup, then subgroup headers A–Z. */
function sortCoordinationSubgroupTree(groups: NavSubgroup[]): NavSubgroup[] {
    const mapped = groups.map((sg) => {
        if (sg.children?.length) {
            return {
                ...sg,
                children: sg.children.map((c) => ({
                    ...c,
                    items: sortNavItemsAlphabetical(c.items ?? []),
                })),
            };
        }
        return { ...sg, items: sortNavItemsAlphabetical(sg.items ?? []) };
    });
    return mapped.sort((a, b) => compareSidebarLabels(a.label, b.label));
}

const CALENDARIO_SESIONES_NAV: NavGroup = {
    label: null,
    icon: "Calendar",
    items: [
        {
            label: "Calendario de sesiones",
            href: "/dashboard/calendario-sesiones",
            icon: "Calendar",
            module: "calendario-sesiones",
        },
    ],
};

/** Proyectos (Empresa): collapsible; first child matches in-app tabs label "Overview". */
const GLOBAL_PROJECTS_GROUP: NavGroup = {
    label: "Proyectos (Empresa)",
    icon: "Kanban",
    items: sortNavItemsAlphabetical([
        {
            label: "Mi trabajo",
            href: "/dashboard/mi-trabajo",
            icon: "ListTodo",
            module: "mi-trabajo",
        },
        {
            label: "Overview",
            href: "/dashboard/proyectos-global",
            icon: "Kanban",
            module: "project-management",
        },
    ]),
};

function ensureDashboardFirst(groups: NavGroup[]): NavGroup[] {
    const idx = groups.findIndex(
        (g) => g.label === null && g.items.length === 1 && g.items[0].href === "/dashboard"
    );
    if (idx <= 0) return groups;
    const dashboardGroup = groups[idx]!;
    return [dashboardGroup, ...groups.filter((_, i) => i !== idx)];
}

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
    "oopt-pdf": "/dashboard/oopt-pdf",
    "calculator": "/dashboard/calculadora-tiempos",
    "catalog": "/dashboard/catalogo/conceptos",
    "suppliers": "/dashboard/proveedores",
    "quotes": "/dashboard/cotizaciones",
    "purchase-orders": "/dashboard/ordenes",
    "payments": "/dashboard/pagos",
    "payroll": "/dashboard/coordinacion-examenes/nominas",
    "rrhh": "/dashboard/rrhh",
    "sgc": "/dashboard/sgc",
    "petty-cash": "/dashboard/finanzas/caja-chica",
    "budget": "/dashboard/finanzas/presupuesto",
    "ih-billing": "/dashboard/coordinacion-examenes/cxc",
    "travel-expenses": "/dashboard/finanzas/viaticos",
    "users": "/dashboard/users",
    "audit-log": "/dashboard/actividad",
    "documentos": "/dashboard/documentos",
    "courses": "/dashboard/academico/cursos",
    "inventory": "/dashboard/logistica/inventario",
    "speaking-packs": "/dashboard/toefl/speaking-packs",
    "unoi-planning": "/dashboard/coordinacion-examenes/unoi-planeacion",
    "event-documents": "/dashboard/coordinacion-examenes/documentos-eventos",
    "crm-pipeline": "/dashboard/crm/pipeline",
    "crm-directory": "/dashboard/crm/directorio",
    "crm-activities": "/dashboard/crm/actividades",
    "crm-metrics": "/dashboard/crm/metricas",
    "ielts": "/dashboard/coordinacion-examenes/ielts",
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
    "Directorio": "BookOpen",
    "Finanzas": "DollarSign",
    "Ajustes": "UserCog",
    "Académico": "GraduationCap",
    "Logística": "Library",
    "Feria de libro": "Library",
    "Comercial": "Users",
};

const AJUSTES_CATEGORY = "Ajustes";

/** Normalize DB/Studio labels onto internal bucket keys used for grouping + icons. */
function canonicalSidebarCategory(category: string): string {
    if (category === "Feria de libro") return "Logística";
    if (category === "Directorio") return "Catálogos";
    return category;
}

/** Label shown in the sidebar (DB bucket key may differ). */
function categoryDisplayLabel(category: string): string {
    if (category === "Logística") return "Feria de libro";
    if (category === "Catálogos") return "Directorio";
    return category;
}

function sortCategoryKeys(keys: string[]): string[] {
    const rest = keys.filter((c) => c !== AJUSTES_CATEGORY);
    rest.sort((a, b) =>
        compareSidebarLabels(categoryDisplayLabel(a), categoryDisplayLabel(b))
    );
    return keys.includes(AJUSTES_CATEGORY) ? [...rest, AJUSTES_CATEGORY] : rest;
}

/** Slugs grouped under "Sistema Uno" (Cambridge / UNOi) inside Coordinación de Exámenes. */
const COORD_EXAM_SISTEMA_UNO_SLUGS = new Set([
    "unoi-planning",
    "calculator",
    "payroll",
    "ih-billing",
]);

/** Escuelas y aplicadores: entradas propias bajo Directorio (no dentro del catálogo de conceptos). */
const DIRECTORIO_UNOI_SLUGS = new Set(["schools", "applicators"]);

/** Slugs grouped under "TOEFL". */
const COORD_EXAM_TOEFL_SLUGS = new Set(["toefl", "toefl-codes", "speaking-packs"]);

const COORD_EXAM_CENNI_SLUGS = new Set(["cenni"]);
const COORD_EXAM_OOPT_SLUGS = new Set(["oopt-pdf"]);
const COORD_EXAM_IELTS_SLUGS = new Set(["ielts"]);

function moduleToNavItem(mod: ModuleRegistryEntry, category: string): NavItem {
    if (
        (category === "Coordinación de Exámenes" || category === "Institucional") &&
        mod.slug === "project-management"
    ) {
        return {
            label: "Proyectos (Coordinación)",
            href: "/dashboard/coordinacion-examenes/proyectos",
            icon: mod.icon,
            module: mod.slug,
        };
    }
    const href = NATIVE_ROUTES[mod.slug] ?? `/dashboard/m/${mod.slug}`;
    return { label: mod.name, href, icon: mod.icon, module: mod.slug };
}

function buildCoordinationExamSubgroups(mods: ModuleRegistryEntry[]): NavSubgroup[] {
    const sistemaUno: NavItem[] = [];
    const toefl: NavItem[] = [];
    const cenni: NavItem[] = [];
    const oopt: NavItem[] = [];
    const ielts: NavItem[] = [];
    const otros: NavItem[] = [];
    for (const mod of mods) {
        const item = moduleToNavItem(mod, "Coordinación de Exámenes");
        if (COORD_EXAM_SISTEMA_UNO_SLUGS.has(mod.slug)) sistemaUno.push(item);
        else if (COORD_EXAM_TOEFL_SLUGS.has(mod.slug)) toefl.push(item);
        else if (COORD_EXAM_CENNI_SLUGS.has(mod.slug)) cenni.push(item);
        else if (COORD_EXAM_OOPT_SLUGS.has(mod.slug)) oopt.push(item);
        else if (COORD_EXAM_IELTS_SLUGS.has(mod.slug)) ielts.push(item);
        else otros.push(item);
    }
    const out: NavSubgroup[] = [];
    if (sistemaUno.length > 0) {
        out.push({
            label: "Cambridge",
            icon: "School",
            children: [{ label: "Sistema Uno", icon: "Building2", items: sistemaUno }],
        });
    }
    if (toefl.length > 0) {
        out.push({ label: "TOEFL", icon: "GraduationCap", items: toefl });
    }
    if (cenni.length > 0) {
        out.push({ label: "CENNI", icon: "FileText", items: cenni });
    }
    if (oopt.length > 0) {
        out.push({ label: "OOPT", icon: "FileText", items: oopt });
    }
    if (ielts.length > 0) {
        out.push({ label: "IELTS", icon: "Languages", items: ielts });
    }
    if (otros.length > 0) {
        out.push({ label: "Eventos y otros", icon: "Layers", items: otros });
    }
    return sortCoordinationSubgroupTree(out);
}

function navItemIsActive(pathname: string, item: NavItem): boolean {
    return item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function flattenSubgroupItems(sg: NavSubgroup): NavItem[] {
    if (sg.children?.length) return sg.children.flatMap(flattenSubgroupItems);
    return sg.items ?? [];
}

function navSubgroupAnyActive(sg: NavSubgroup, pathname: string): boolean {
    if (sg.children?.length) return sg.children.some((c) => navSubgroupAnyActive(c, pathname));
    return (sg.items ?? []).some((i) => navItemIsActive(pathname, i));
}

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
const PORTAL_ITEMS: NavItem[] = sortNavItemsAlphabetical([
    { label: "Portal", href: "/portal", icon: "BarChart3", module: "inventory" },
    { label: "Mis eventos", href: "/portal/eventos", icon: "ClipboardList", module: "events" },
    { label: "Horarios", href: "/portal/horarios", icon: "Calendar", module: "events" },
    { label: "Nómina", href: "/portal/nomina", icon: "DollarSign", module: "payroll" },
    { label: "Métricas", href: "/portal/metricas", icon: "BarChart3", module: "dashboard" },
]);

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
                const cat = canonicalSidebarCategory(mod.category);
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(mod);
            }
        }

        const dashMod = topLevel.find((m) => m.slug === "dashboard");
        const otherTop = topLevel.filter((m) => m.slug !== "dashboard");
        otherTop.sort((a, b) => compareSidebarLabels(a.name, b.name));

        const topGroupsSansDash: NavGroup[] = otherTop.map((mod) => {
            const href = NATIVE_ROUTES[mod.slug] ?? `/dashboard/m/${mod.slug}`;
            return {
                label: null,
                icon: mod.icon,
                items: [{ label: mod.name, href, icon: mod.icon, module: mod.slug }],
            };
        });

        const categoryGroups: NavGroup[] = [];
        const sortedCategoryKeys = sortCategoryKeys(Object.keys(grouped));

        for (const category of sortedCategoryKeys) {
            const mods = grouped[category];
            if (!mods || mods.length === 0) continue;

            if (category === "Coordinación de Exámenes") {
                const modsForCoord = mods.filter((m) => !DIRECTORIO_UNOI_SLUGS.has(m.slug));
                const subgroups = buildCoordinationExamSubgroups(modsForCoord);
                const items = subgroups.flatMap(flattenSubgroupItems);
                categoryGroups.push({
                    label: categoryDisplayLabel(category),
                    icon: CATEGORY_ICONS[category] ?? "Layers",
                    items,
                    subgroups,
                });
                continue;
            }

            let items: NavItem[] = sortNavItemsAlphabetical(
                mods.map((mod) => moduleToNavItem(mod, category))
            );

            if (category === "Catálogos") {
                const extras: NavItem[] = [];
                for (const slug of DIRECTORIO_UNOI_SLUGS) {
                    const mod = modules.find((m) => m.slug === slug);
                    if (!mod) continue;
                    if (mod.is_native && !canViewModule(slug)) continue;
                    extras.push(moduleToNavItem(mod, category));
                }
                items = sortNavItemsAlphabetical([...items, ...extras]);
            }

            categoryGroups.push({
                label: categoryDisplayLabel(category),
                icon: CATEGORY_ICONS[category] ?? "Layers",
                items,
            });
        }

        const merged = [CALENDARIO_SESIONES_NAV, ...topGroupsSansDash, ...categoryGroups];
        merged.sort((a, b) => compareSidebarLabels(navGroupSortKey(a), navGroupSortKey(b)));

        const ajustesG = merged.find((g) => g.label === "Ajustes");
        const mergedSansAjustes = merged.filter((g) => g.label !== "Ajustes");
        const orderedMid = ajustesG ? [...mergedSansAjustes, ajustesG] : mergedSansAjustes;

        const result: NavGroup[] = [];
        if (dashMod) {
            const href = NATIVE_ROUTES[dashMod.slug] ?? `/dashboard/m/${dashMod.slug}`;
            result.push({
                label: null,
                icon: dashMod.icon,
                items: [{ label: dashMod.name, href, icon: dashMod.icon, module: dashMod.slug }],
            });
        }
        result.push(...orderedMid);

        if (canViewGlobalProjects) {
            const coordinationIndex = result.findIndex(
                (group) => group.label === "Coordinación de Exámenes" || group.label === "Institucional"
            );
            if (coordinationIndex >= 0) {
                result.splice(coordinationIndex + 1, 0, GLOBAL_PROJECTS_GROUP);
            } else {
                result.push(GLOBAL_PROJECTS_GROUP);
            }
        }

        return ensureDashboardFirst(result);
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
                    const isAnyChildActive = group.subgroups?.length
                        ? group.subgroups.some((sg) => navSubgroupAnyActive(sg, pathname))
                        : group.items.some((i) => navItemIsActive(pathname, i));

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
                                    {group.subgroups && group.subgroups.length > 0 ? (
                                        group.subgroups.map((sg) => {
                                            if (sg.children?.length) {
                                                const ParentIcon = getIcon(sg.icon);
                                                const parentActive = navSubgroupAnyActive(sg, pathname);
                                                return (
                                                    <Collapsible
                                                        key={sg.label}
                                                        defaultOpen={parentActive}
                                                        className="w-full"
                                                    >
                                                        <CollapsibleTrigger asChild>
                                                            <button
                                                                type="button"
                                                                className={cn(
                                                                    "flex w-full items-center justify-between rounded-md py-1.5 pl-2 pr-1 text-xs font-semibold tracking-tight transition-colors hover:bg-accent/60",
                                                                    "[&[data-state=open]>svg:last-child]:rotate-180",
                                                                    parentActive
                                                                        ? "text-foreground"
                                                                        : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                            >
                                                                <span className="flex min-w-0 items-center gap-2">
                                                                    <ParentIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                                                    <span className="truncate">{sg.label}</span>
                                                                </span>
                                                                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200" />
                                                            </button>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="ml-2 border-l border-border/50 pl-2 space-y-0.5 py-0.5">
                                                            {sg.children.map((child) => {
                                                                const ChildIcon = getIcon(child.icon);
                                                                const childActive = (child.items ?? []).some((i) =>
                                                                    navItemIsActive(pathname, i)
                                                                );
                                                                return (
                                                                    <Collapsible
                                                                        key={`${sg.label}-${child.label}`}
                                                                        defaultOpen={childActive}
                                                                        className="w-full"
                                                                    >
                                                                        <CollapsibleTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                className={cn(
                                                                                    "flex w-full items-center justify-between rounded-md py-1.5 pl-2 pr-1 text-xs font-semibold tracking-tight transition-colors hover:bg-accent/60",
                                                                                    "[&[data-state=open]>svg:last-child]:rotate-180",
                                                                                    childActive
                                                                                        ? "text-foreground"
                                                                                        : "text-muted-foreground hover:text-foreground"
                                                                                )}
                                                                            >
                                                                                <span className="flex min-w-0 items-center gap-2">
                                                                                    <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                                                                    <span className="truncate">{child.label}</span>
                                                                                </span>
                                                                                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200" />
                                                                            </button>
                                                                        </CollapsibleTrigger>
                                                                        <CollapsibleContent className="ml-2 border-l border-border/40 pl-2 space-y-0.5 py-0.5">
                                                                            {(child.items ?? []).map((item) => {
                                                                                const SubIcon = getIcon(item.icon);
                                                                                const isActive = navItemIsActive(pathname, item);
                                                                                return (
                                                                                    <Link
                                                                                        key={item.href}
                                                                                        href={item.href}
                                                                                        className={cn(
                                                                                            "group/sub flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all",
                                                                                            "hover:bg-accent hover:text-accent-foreground",
                                                                                            isActive
                                                                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                                                                : "text-muted-foreground"
                                                                                        )}
                                                                                    >
                                                                                        <SubIcon className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/sub:scale-110" />
                                                                                        <span className="truncate">{item.label}</span>
                                                                                    </Link>
                                                                                );
                                                                            })}
                                                                        </CollapsibleContent>
                                                                    </Collapsible>
                                                                );
                                                            })}
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                );
                                            }

                                            const SgIcon = getIcon(sg.icon);
                                            const leafItems = sg.items ?? [];
                                            const sgActive = leafItems.some((i) => navItemIsActive(pathname, i));
                                            return (
                                                <Collapsible
                                                    key={sg.label}
                                                    defaultOpen={sgActive}
                                                    className="w-full"
                                                >
                                                    <CollapsibleTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className={cn(
                                                                "flex w-full items-center justify-between rounded-md py-1.5 pl-2 pr-1 text-xs font-semibold tracking-tight transition-colors hover:bg-accent/60",
                                                                "[&[data-state=open]>svg:last-child]:rotate-180",
                                                                sgActive
                                                                    ? "text-foreground"
                                                                    : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            <span className="flex min-w-0 items-center gap-2">
                                                                <SgIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                                                <span className="truncate">{sg.label}</span>
                                                            </span>
                                                            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200" />
                                                        </button>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="ml-2 border-l border-border/50 pl-2 space-y-0.5 py-0.5">
                                                        {leafItems.map((item) => {
                                                            const SubIcon = getIcon(item.icon);
                                                            const isActive = navItemIsActive(pathname, item);
                                                            return (
                                                                <Link
                                                                    key={item.href}
                                                                    href={item.href}
                                                                    className={cn(
                                                                        "group/sub flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all",
                                                                        "hover:bg-accent hover:text-accent-foreground",
                                                                        isActive
                                                                            ? "bg-primary text-primary-foreground shadow-sm"
                                                                            : "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    <SubIcon className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/sub:scale-110" />
                                                                    <span className="truncate">{item.label}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            );
                                        })
                                    ) : (
                                        group.items.map((item) => {
                                            const SubIcon = getIcon(item.icon);
                                            const isActive = navItemIsActive(pathname, item);

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
                                        })
                                    )}
                                </CollapsibleContent>
                            )}
                        </Collapsible>
                    );
                })}
            </nav>
        </ScrollArea>
    );
}
