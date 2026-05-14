"use client";

import Link from "next/link";
import useSWR from "swr";
import { ReactNode } from "react";
import { CalendarCheck2, ClipboardList, FileCheck2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type EventItem = {
    id: string;
    status: string;
    school?: { name?: string };
    event_sessions?: Array<{ date?: string | null; exam_type?: string | null }>;
};

type CenniCase = {
    id: string;
    estatus: string;
};

type ExamCode = {
    id: string;
    status: string;
};

export default function CoordinacionExamenesProyectosPage() {
    const { data: statsData } = useSWR("/api/v1/dashboard/stats", fetcher);
    const { data: eventsData, isLoading } = useSWR<{ events?: EventItem[] }>("/api/v1/events?limit=12", fetcher);
    const { data: cenniData } = useSWR<{ cases?: CenniCase[] }>("/api/v1/cenni?limit=200", fetcher);
    const { data: examCodesData } = useSWR<{ codes?: ExamCode[] }>("/api/v1/exam-codes", fetcher);
    const { data: toeflCodesData } = useSWR<{ codes?: ExamCode[] }>("/api/v1/toefl/codes", fetcher);

    const events = eventsData?.events ?? [];
    const cenniCases = cenniData?.cases ?? [];
    const examCodes = examCodesData?.codes ?? [];
    const toeflCodes = toeflCodesData?.codes ?? [];
    const upcoming = events.filter((event) => event.status === "published" || event.status === "in_progress");
    const eventsDraft = events.filter((event) => String(event.status).toUpperCase() === "DRAFT");
    const sessionCount = events.reduce((acc, event) => acc + (event.event_sessions?.length ?? 0), 0);
    const cenniPending = cenniCases.filter((item) => ["PENDIENTE", "SOLICITADO"].includes(String(item.estatus).toUpperCase()));
    const examCodesAvailable = examCodes.filter((code) => String(code.status).toUpperCase() === "AVAILABLE");
    const toeflCodesAvailable = toeflCodes.filter((code) => String(code.status).toUpperCase() === "AVAILABLE");

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Coordinacion de Examenes - Proyectos</h1>
                <p className="max-w-3xl text-muted-foreground">
                    Vista operativa: integra Eventos, CENNI y codigos. El modulo de empresa esta en
                    <strong> Proyectos (Empresa)</strong>.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <MetricCard
                    title="Eventos activos"
                    value={upcoming.length}
                    description="Publicados o en ejecucion"
                    icon={<CalendarCheck2 className="h-4 w-4 text-primary" />}
                />
                <MetricCard
                    title="Sesiones programadas"
                    value={sessionCount}
                    description="Sesiones registradas"
                    icon={<ClipboardList className="h-4 w-4 text-primary" />}
                />
                <MetricCard
                    title="Casos CENNI"
                    value={statsData?.cenni?.total ?? statsData?.general?.cenniTotal ?? 0}
                    description="Referencia institucional"
                    icon={<FileCheck2 className="h-4 w-4 text-primary" />}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Acceso rapido</CardTitle>
                    <CardDescription>Enlaces a modulos de coordinacion de examenes.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    <QuickLink href="/dashboard/eventos" title="Eventos" description="Planeacion y ejecucion" />
                    <QuickLink href="/dashboard/coordinacion-examenes/documentos-eventos" title="Documentos de eventos" description="Control documental por evento" />
                    <QuickLink href="/dashboard/coordinacion-examenes/unoi-planeacion" title="Planeación UNOi" description="Importación y vinculación a eventos" />
                    <QuickLink href="/dashboard/cenni" title="CENNI" description="Seguimiento de tramites" />
                    <QuickLink href="/dashboard/codigos" title="Codigos de examen" description="Disponibilidad de codigos" />
                    <QuickLink href="/dashboard/toefl/codigos" title="TOEFL - Codigos" description="Lotes y disponibilidad" />
                    <QuickLink href="/dashboard/toefl/administraciones" title="TOEFL - Administraciones" description="Calendario operativo" />
                    <QuickLink href="/dashboard/coordinacion-proyectos-lec" title="Coordinación proyectos LEC" description="Indicadores, exámenes vendidos, cursos" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pendientes criticos</CardTitle>
                    <CardDescription>Prioriza el trabajo del dia.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <PendingCard
                        title="Eventos en borrador"
                        value={eventsDraft.length}
                        hint="Revisar para publicar o cerrar."
                        href="/dashboard/eventos"
                    />
                    <PendingCard
                        title="Casos CENNI pendientes"
                        value={cenniPending.length}
                        hint="PENDIENTE + SOLICITADO."
                        href="/dashboard/cenni"
                    />
                    <PendingCard
                        title="Codigos examen disponibles"
                        value={examCodesAvailable.length}
                        hint="Stock activo general."
                        href="/dashboard/codigos"
                    />
                    <PendingCard
                        title="TOEFL disponibles"
                        value={toeflCodesAvailable.length}
                        hint="Slots TOEFL activos."
                        href="/dashboard/toefl/codigos"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Seguimiento de eventos</CardTitle>
                    <CardDescription>Resumen de eventos recientes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : null}
                    {!isLoading && events.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                            Sin eventos recientes.
                        </div>
                    ) : null}
                    {events.map((event) => (
                        <div key={event.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                            <div>
                                <p className="text-sm font-medium">{event.school?.name ?? "Sede sin nombre"}</p>
                                <p className="text-xs text-muted-foreground">
                                    {event.event_sessions?.[0]?.exam_type ?? "Tipo no definido"}
                                </p>
                            </div>
                            <Badge variant="secondary">{event.status}</Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function QuickLink({
    href,
    title,
    description,
}: {
    href: string;
    title: string;
    description: string;
}) {
    return (
        <Link href={href} className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
        </Link>
    );
}

function PendingCard({
    title,
    value,
    hint,
    href,
}: {
    title: string;
    value: number;
    hint: string;
    href: string;
}) {
    return (
        <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
            <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
            <Button asChild size="sm" variant="outline" className="h-8">
                <Link href={href} className="gap-1">
                    Ir al modulo
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </Button>
        </div>
    );
}

function MetricCard({
    title,
    value,
    description,
    icon,
}: {
    title: string;
    value: number;
    description: string;
    icon: ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}
