"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SUBMODULES: { href: string; label: string }[] = [
    { href: "/dashboard/proyectos-global", label: "Overview" },
    { href: "/dashboard/proyectos-global/portafolio", label: "Portafolio" },
    { href: "/dashboard/proyectos-global/tareas", label: "Tareas" },
    { href: "/dashboard/proyectos-global/lista", label: "Lista" },
    { href: "/dashboard/proyectos-global/tablero", label: "Tablero" },
    { href: "/dashboard/proyectos-global/calendario", label: "Calendario" },
    { href: "/dashboard/proyectos-global/gantt", label: "Gantt" },
    { href: "/dashboard/proyectos-global/tabla", label: "Tabla" },
];

export function ProyectosEmpresaShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Proyectos (Empresa)</h1>
                <p className="max-w-3xl text-muted-foreground">
                    Módulo PM transversal de la organización. Submódulos por vista; la coordinación de exámenes vive en{" "}
                    <strong>Institucional</strong>.
                </p>
            </div>

            <nav
                className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
                aria-label="Submódulos de proyectos"
            >
                {SUBMODULES.map((item) => {
                    const isOverview = item.href === "/dashboard/proyectos-global";
                    const isActive = isOverview
                        ? pathname === "/dashboard/proyectos-global"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                            )}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {children}
        </div>
    );
}
