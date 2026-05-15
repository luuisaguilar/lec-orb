"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers } from "lucide-react";
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
        <div className="flex flex-col gap-6">
            <header
                className={cn(
                    "relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br px-5 py-6 shadow-sm sm:px-6 sm:py-7",
                    "from-primary/[0.08] via-background to-violet-500/[0.07]",
                    "dark:from-primary/[0.14] dark:via-card/80 dark:to-violet-600/[0.12] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]",
                )}
            >
                <div
                    className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/15"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/10"
                    aria-hidden
                />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner ring-1 ring-primary/20 dark:bg-primary/25 dark:ring-primary/30">
                            <Layers className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                Coordinación proyectos LEC
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                                Concentrado operativo y comercial (indicadores, exámenes mensuales, cursos). Complementa{" "}
                                <Link
                                    href="/dashboard/eventos"
                                    className="font-medium text-primary underline-offset-4 hover:text-primary/90 hover:underline"
                                >
                                    Eventos
                                </Link>
                                ,{" "}
                                <Link
                                    href="/dashboard/schools"
                                    className="font-medium text-primary underline-offset-4 hover:text-primary/90 hover:underline"
                                >
                                    Escuelas
                                </Link>
                                ,{" "}
                                <Link
                                    href="/dashboard/crm/pipeline"
                                    className="font-medium text-primary underline-offset-4 hover:text-primary/90 hover:underline"
                                >
                                    CRM
                                </Link>
                                ,{" "}
                                <Link
                                    href="/dashboard/documentos"
                                    className="font-medium text-primary underline-offset-4 hover:text-primary/90 hover:underline"
                                >
                                    Documentos
                                </Link>{" "}
                                y{" "}
                                <Link
                                    href="/dashboard/proyectos-global"
                                    className="font-medium text-primary underline-offset-4 hover:text-primary/90 hover:underline"
                                >
                                    Proyectos (Empresa)
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <nav
                className={cn(
                    "flex flex-wrap gap-1 rounded-xl border border-border/90 bg-muted/25 p-1.5 shadow-inner",
                    "dark:border-border/60 dark:bg-muted/15 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
                )}
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
                                "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/30 dark:shadow-lg dark:ring-primary/40"
                                    : "text-muted-foreground hover:bg-background/90 hover:text-foreground dark:hover:bg-background/40",
                            )}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="min-w-0">{children}</div>
        </div>
    );
}
