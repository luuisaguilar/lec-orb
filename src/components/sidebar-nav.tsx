"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import {
    ChevronDown,
    Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
    "inventory": "/dashboard/inventario",
    "toefl": "/dashboard/toefl/administraciones",
    "cenni": "/dashboard/cenni",
    "exam-codes": "/dashboard/codigos",
    "calculator": "/dashboard/calculadora-tiempos",
    "catalog": "/dashboard/catalogo",
    "quotes": "/dashboard/cotizaciones",
    "purchase-orders": "/dashboard/ordenes",
    "payments": "/dashboard/pagos",
    "payroll": "/dashboard/nomina",
    "users": "/dashboard/users",
    "audit-log": "/dashboard/actividad",
    "documentos": "/dashboard/documentos",
};

// ─────────────────────────────────────────────────────────────────────────────
// Category group icon — shown on the collapsible parent
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
    "Institucional": "Building2",
    "Inventario": "Package",
    "Exámenes": "GraduationCap",
    "Catálogos": "BookOpen",
    "Finanzas": "DollarSign",
    "Ajustes": "UserCog",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─────────────────────────────────────────────────────────────────────────────
// Portal nav (static — no module registry needed for applicator portal)
// ─────────────────────────────────────────────────────────────────────────────
const PORTAL_ITEMS: NavItem[] = [
    { label: "Portal", href: "/portal", icon: "BarChart3", module: "inventory" },
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
    const { t } = useI18n();

    // User data (permissions, role) — existing SWR call
    const { data: userData, isLoading: userLoading } = useSWR("/api/v1/users/me", fetcher);

    // Module registry — new SWR call
    const { data: modulesData, isLoading: modulesLoading } = useSWR(
        variant === "dashboard" ? "/api/v1/modules" : null,
        fetcher
    );

    const isLoading = userLoading || modulesLoading;

    // ── Build navigation groups from module_registry ──────────────────────────
    const navGroups = useMemo<NavGroup[]>(() => {
        if (!userData || !modulesData) return [];

        if (variant === "portal") {
            // Portal stays static, no module registry needed
            const perms = userData.permissions || [];
            const check = (module: string) => {
                if (module === "dashboard") return true;
                if (userData.role === "admin") return true;
                return perms.find((p: any) => p.module === module)?.can_view;
            };
            return [{
                label: null,
                icon: "BarChart3",
                items: PORTAL_ITEMS.filter((i) => check(i.module)),
            }];
        }

        const modules: ModuleRegistryEntry[] = modulesData.modules ?? [];
        const perms: any[] = userData.permissions ?? [];
        const isAdmin = userData.role === "admin";

        // Permission check for native modules (uses existing SWR /users/me data)
        const canViewModule = (slug: string): boolean => {
            if (isAdmin) return true;
            if (slug === "dashboard" || slug === "audit-log") return true;
            if (slug === "catalog") return true; // always readable
            const perm = perms.find((p) => p.module === slug);
            return perm?.can_view ?? false;
        };

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
            const href = mod.is_native
                ? (NATIVE_ROUTES[mod.slug] ?? `/dashboard/m/${mod.slug}`)
                : `/dashboard/m/${mod.slug}`;
            result.push({
                label: null,
                icon: mod.icon,
                items: [{ label: mod.name, href, icon: mod.icon, module: mod.slug }],
            });
        }

        // Category groups
        const orderedCategories = [
            "Institucional", "Inventario", "Exámenes", "Catálogos", "Finanzas", "Ajustes",
            // Any additional custom categories follow
        ];
        const allCategories = [
            ...orderedCategories,
            ...Object.keys(grouped).filter((c) => !orderedCategories.includes(c)),
        ];

        for (const category of allCategories) {
            const mods = grouped[category];
            if (!mods || mods.length === 0) continue;

            const items: NavItem[] = mods.map((mod) => {
                const href = mod.is_native
                    ? (NATIVE_ROUTES[mod.slug] ?? `/dashboard/m/${mod.slug}`)
                    : `/dashboard/m/${mod.slug}`;
                return { label: mod.name, href, icon: mod.icon, module: mod.slug };
            });

            result.push({
                label: category,
                icon: CATEGORY_ICONS[category] ?? "Layers",
                items,
            });
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

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <nav className={cn("flex flex-col gap-1", className)}>
            {navGroups.map((group, idx) => {
                const GroupIcon = getIcon(group.icon);

                // Single item with no category label — renders as a direct Link
                if (!group.label && group.items.length === 1) {
                    const item = group.items[0];
                    const ItemIcon = getIcon(item.icon);
                    const isActive =
                        item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.label : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all",
                                isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-3",
                                "hover:bg-accent hover:text-accent-foreground",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground"
                            )}
                        >
                            <ItemIcon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    );
                }

                // Group with collapsible children
                const isAnyChildActive = group.items.some((i) =>
                    i.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(i.href)
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
                                    <GroupIcon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
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
                                            : pathname.startsWith(item.href);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                                "hover:bg-accent hover:text-accent-foreground",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            <SubIcon className="h-4 w-4 shrink-0" />
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
    );
}
