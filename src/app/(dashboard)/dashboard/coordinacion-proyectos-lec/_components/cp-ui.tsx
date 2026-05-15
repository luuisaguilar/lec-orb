import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Contenedor de tablas: legible en claro/oscuro sin grises planos. */
export const cpTableShellClass =
    "overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm dark:border-border/60 dark:bg-card/90 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]";

export function CpPageBlurb({ children }: { children: ReactNode }) {
    return <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

export function CpLoadingState({ label = "Cargando…" }: { label?: string }) {
    return (
        <div
            className="flex items-center gap-3 rounded-xl border border-dashed border-primary/25 bg-primary/[0.04] px-4 py-6 text-sm text-muted-foreground dark:border-primary/30 dark:bg-primary/[0.08]"
            role="status"
        >
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            {label}
        </div>
    );
}

export function CpDeniedState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/10">
            {message}
        </div>
    );
}

const accentTop: Record<"sky" | "violet" | "emerald" | "amber" | "rose", string> = {
    sky: "from-sky-500 via-cyan-400 to-sky-400",
    violet: "from-violet-500 via-fuchsia-500 to-violet-400",
    emerald: "from-emerald-500 via-teal-400 to-emerald-400",
    amber: "from-amber-500 via-orange-400 to-amber-400",
    rose: "from-rose-500 via-orange-400 to-rose-400",
};

export function CpStatCard({
    title,
    accent = "sky",
    children,
    footer,
}: {
    title: string;
    accent?: keyof typeof accentTop;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <Card
            className={cn(
                "relative overflow-hidden border-border/90 bg-card shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md",
                "dark:border-border/55 dark:bg-gradient-to-b dark:from-card dark:to-card/70",
            )}
        >
            <div
                className={cn("h-1 w-full bg-gradient-to-r opacity-95 dark:opacity-90", accentTop[accent])}
                aria-hidden
            />
            <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pb-4">
                <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{children}</div>
                {footer ? (
                    <div className="space-y-0.5 text-xs leading-relaxed text-muted-foreground [&_.font-medium]:text-foreground/90">
                        {footer}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

export function CpListCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card
            className={cn(
                "overflow-hidden border-border/90 bg-card shadow-sm dark:border-border/55 dark:bg-card/90",
                "transition-shadow hover:shadow-md",
            )}
        >
            <div className={cn("h-0.5 w-full bg-gradient-to-r opacity-90", accentTop.violet)} aria-hidden />
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">{children}</CardContent>
        </Card>
    );
}

export function CpPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <div
            className={cn(
                "space-y-4 rounded-2xl border border-border/90 bg-gradient-to-br from-card via-card to-muted/20 p-5 shadow-sm",
                "dark:border-border/60 dark:from-card dark:via-card/95 dark:to-violet-950/20 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
            )}
        >
            <div>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {children}
        </div>
    );
}
