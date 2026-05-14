"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const BASE = "/dashboard/coordinacion-proyectos-lec";

const SUBMODULES: { href: string; label: string }[] = [
    { href: BASE, label: "Overview" },
    { href: `${BASE}/concentrado`, label: "Concentrado" },
    { href: `${BASE}/examenes`, label: "Exámenes" },
    { href: `${BASE}/cursos`, label: "Cursos" },
    { href: `${BASE}/importar`, label: "Importar" },
];

export function CoordinacionProyectosShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Coordinación proyectos LEC</h1>
                <p className="max-w-3xl text-muted-foreground">
                    Concentrado operativo y comercial (indicadores de proyectos, registro mensual de exámenes, cursos).
                    Complementa{" "}
                    <Link href="/dashboard/eventos" className="text-primary underline-offset-4 hover:underline">
                        Eventos
                    </Link>
                    ,{" "}
                    <Link href="/dashboard/schools" className="text-primary underline-offset-4 hover:underline">
                        Escuelas
                    </Link>
                    ,{" "}
                    <Link href="/dashboard/crm/pipeline" className="text-primary underline-offset-4 hover:underline">
                        CRM
                    </Link>
                    ,{" "}
                    <Link href="/dashboard/documentos" className="text-primary underline-offset-4 hover:underline">
                        Documentos
                    </Link>{" "}
                    y el tablero{" "}
                    <Link href="/dashboard/proyectos-global" className="text-primary underline-offset-4 hover:underline">
                        Proyectos (Empresa)
                    </Link>
                    .
                </p>
            </div>

            <nav
                className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
                aria-label="Secciones coordinación proyectos LEC (Overview, flujo operativo e importación)"
            >
                {SUBMODULES.map((item) => {
                    const isOverview = item.href === BASE;
                    const isActive = isOverview ? pathname === BASE : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
