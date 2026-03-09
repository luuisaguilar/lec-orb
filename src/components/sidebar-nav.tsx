"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import {
    Package,
    School,
    Users,
    Calendar,
    BookOpen,
    DollarSign,
    FileText,
    Calculator,
    BarChart3,
    UserCog,
    History,
    ChevronDown,
    GraduationCap,
    Briefcase,
    Building2,
    Loader2
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface NavItem {
    labelKey: string;
    href?: string;
    icon: any;
    module?: string;
    subItems?: NavItem[];
}

const dashboardNavItems: NavItem[] = [
    {
        labelKey: "nav.dashboard",
        href: "/dashboard",
        icon: BarChart3,
        module: "dashboard",
    },
    {
        labelKey: "Institucional",
        icon: Building2,
        subItems: [
            { labelKey: "nav.schools", href: "/dashboard/schools", icon: School, module: "escuelas" },
            { labelKey: "nav.applicators", href: "/dashboard/applicators", icon: Users, module: "escuelas" },
            { labelKey: "nav.events", href: "/dashboard/eventos", icon: Calendar, module: "eventos" },
        ]
    },
    {
        labelKey: "Inventario",
        icon: Package,
        subItems: [
            { labelKey: "Speaking Packs", href: "/dashboard/inventario", icon: Package, module: "inventario" },
        ]
    },
    {
        labelKey: "Exámenes",
        icon: GraduationCap,
        subItems: [
            { labelKey: "Exámenes TOEFL", href: "/dashboard/toefl/administraciones", icon: Calendar, module: "examenes" },
            { labelKey: "Códigos TOEFL", href: "/dashboard/toefl/codigos", icon: Package, module: "examenes" },
            { labelKey: "Códigos Exámenes", href: "/dashboard/codigos", icon: Package, module: "examenes" },
            { labelKey: "nav.cenni", href: "/dashboard/cenni", icon: FileText, module: "cenni" },
            { labelKey: "Calculadora de Tiempos", href: "/dashboard/calculadora-tiempos", icon: Calculator, module: "examenes" },
        ]
    },
    {
        labelKey: "Catálogos",
        icon: Briefcase,
        subItems: [
            { labelKey: "nav.catalog", href: "/dashboard/catalogo", icon: BookOpen, module: "catalog" },
        ]
    },
    {
        labelKey: "Administración",
        icon: DollarSign,
        subItems: [
            { labelKey: "Cotizaciones", href: "/dashboard/cotizaciones", icon: FileText, module: "finanzas" },
            { labelKey: "Órdenes de Compra", href: "/dashboard/ordenes", icon: Package, module: "finanzas" },
            { labelKey: "Pagos con Referencia", href: "/dashboard/pagos", icon: DollarSign, module: "finanzas" },
            { labelKey: "nav.payroll", href: "/dashboard/nomina", icon: Calculator, module: "finanzas" },
        ]
    },
    {
        labelKey: "Ajustes",
        icon: UserCog,
        subItems: [
            { labelKey: "nav.users", href: "/dashboard/users", icon: Users, module: "usuarios" },
            { labelKey: "Audit Log", href: "/dashboard/actividad", icon: History, module: "dashboard" }
        ]
    }
];

const portalNavItems: NavItem[] = [
    { labelKey: "portal.summary", href: "/portal", icon: BarChart3, module: "inventario" },
    { labelKey: "portal.schedule", href: "/portal/horarios", icon: Calendar, module: "eventos" },
    { labelKey: "portal.payroll", href: "/portal/nomina", icon: DollarSign, module: "finanzas" },
    { labelKey: "portal.metrics", href: "/portal/metricas", icon: BarChart3, module: "dashboard" },
];

interface SidebarNavProps {
    variant: "dashboard" | "portal";
    className?: string;
    isCollapsed?: boolean;
}

export function SidebarNav({ variant, className, isCollapsed }: SidebarNavProps) {
    const pathname = usePathname();
    const { t } = useI18n();
    const { data: userData, isLoading } = useSWR("/api/v1/users/me", fetcher);

    const filteredItems = useMemo(() => {
        if (!userData || isLoading) return [];
        const items = variant === "dashboard" ? dashboardNavItems : portalNavItems;

        // Admin sees all
        if (userData.role === "admin") return items;

        const perms = userData.permissions || [];
        const check = (module?: string) => {
            if (!module) return true;
            if (module === "dashboard") return true; // Always allow dash/activity
            if (module === "catalog") return true;  // Catalog usually public/read for all
            return perms.find((p: any) => p.module === module)?.can_view;
        };

        return items.filter(item => {
            if (item.subItems) {
                // Keep parent if at least one child is visible
                const visibleChildren = item.subItems.filter(sub => check(sub.module));
                if (visibleChildren.length > 0) {
                    item.subItems = visibleChildren;
                    return true;
                }
                return false;
            }
            return check(item.module);
        });
    }, [userData, isLoading, variant]);

    if (isLoading) {
        return (
            <div className="flex h-10 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <nav className={cn("flex flex-col gap-1", className)}>
            {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const label = item.labelKey.includes(".") ? t(item.labelKey as any) : item.labelKey;

                if (item.subItems) {
                    const isAnyChildActive = item.subItems.some(sub => sub.href && (sub.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(sub.href)));

                    return (
                        <Collapsible key={index} defaultOpen={isAnyChildActive} className="w-full">
                            <CollapsibleTrigger asChild>
                                <button
                                    title={isCollapsed ? label : undefined}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg py-2 text-sm font-medium transition-all group",
                                        isCollapsed ? "px-0 h-10 w-10 mx-auto justify-center" : "px-3 gap-3",
                                        "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                                        isAnyChildActive && "text-foreground font-semibold"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                                        {!isCollapsed && <span className="truncate">{label}</span>}
                                    </div>
                                    {!isCollapsed && (
                                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    )}
                                </button>
                            </CollapsibleTrigger>
                            {!isCollapsed && (
                                <CollapsibleContent className="space-y-1 px-3 pt-1 pb-2">
                                    {item.subItems.map((subItem) => {
                                        const SubIcon = subItem.icon;
                                        const isSubActive = subItem.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(subItem.href!);
                                        const subLabel = subItem.labelKey.includes(".") ? t(subItem.labelKey as any) : subItem.labelKey;
                                        return (
                                            <Link
                                                key={subItem.href}
                                                href={subItem.href!}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                                    "hover:bg-accent hover:text-accent-foreground",
                                                    isSubActive
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                <SubIcon className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{subLabel}</span>
                                            </Link>
                                        );
                                    })}
                                </CollapsibleContent>
                            )}
                        </Collapsible>
                    );
                }

                const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href!);

                return (
                    <Link
                        key={item.href}
                        href={item.href!}
                        title={isCollapsed ? label : undefined}
                        className={cn(
                            "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all",
                            isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-3",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground"
                        )}
                    >
                        <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                        {!isCollapsed && <span className="truncate">{label}</span>}
                    </Link>
                );
            })}
        </nav>
    );
}
