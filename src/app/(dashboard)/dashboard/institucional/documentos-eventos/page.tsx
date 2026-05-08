"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { FileText, CalendarDays, School, List, Grid3X3, Network, GanttChartSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type EventItem = {
    id: string;
    title: string;
    date: string;
    school?: { name?: string | null } | null;
    sessions?: Array<{ exam_type?: string | null }>;
};

type DocumentItem = {
    id: string;
    record_id: string | null;
    file_name: string;
    tags?: string[];
};

function countByArea(docs: DocumentItem[]) {
    let logistics = 0;
    let certificates = 0;
    let results = 0;
    for (const doc of docs) {
        const tags = new Set((doc.tags ?? []).map((t) => String(t).toLowerCase()));
        const fileName = String(doc.file_name ?? "").toLowerCase();
        if (tags.has("event-logistics")) logistics++;
        if (tags.has("event-certificate")) certificates++;
        if (tags.has("event-results")) results++;
        if (fileName.includes("certificate") || fileName.includes("certificado")) certificates++;
        if (fileName.includes("result")) results++;
    }
    return { logistics, certificates, results };
}

function getEventExamTypes(event: EventItem): string[] {
    const values = Array.from(
        new Set(
            (event.sessions ?? [])
                .map((s) => String(s.exam_type ?? "").toLowerCase())
                .filter(Boolean)
        )
    );
    return values.length > 0 ? values : ["sin-tipo"];
}

export default function EventDocumentsModulePage() {
    const router = useRouter();
    const { data: eventsData, isLoading: eventsLoading } = useSWR("/api/v1/events?limit=300", fetcher);
    const { data: docsData, isLoading: docsLoading } = useSWR("/api/v1/documents?module=events", fetcher);
    const events: EventItem[] = eventsData?.events ?? [];
    const documents: DocumentItem[] = docsData?.documents ?? [];
    const [search, setSearch] = useState("");
    const [view, setView] = useState<"list" | "grid">("list");
    const [mainView, setMainView] = useState<"events" | "schools" | "gantt">("events");

    const docsByEvent = useMemo(() => {
        const grouped = new Map<string, DocumentItem[]>();
        for (const doc of documents) {
            if (!doc.record_id) continue;
            const key = String(doc.record_id);
            const current = grouped.get(key) ?? [];
            current.push(doc);
            grouped.set(key, current);
        }
        return grouped;
    }, [documents]);

    const filteredEvents = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return events;
        return events.filter((event) => {
            const title = event.title?.toLowerCase() ?? "";
            const school = event.school?.name?.toLowerCase() ?? "";
            const exams = getEventExamTypes(event).join(" ");
            return title.includes(q) || school.includes(q) || exams.includes(q);
        });
    }, [events, search]);

    const schoolsViewData = useMemo(() => {
        const grouped = new Map<string, EventItem[]>();
        for (const event of filteredEvents) {
            const schoolName = event.school?.name || "Sin sede";
            const current = grouped.get(schoolName) ?? [];
            current.push(event);
            grouped.set(schoolName, current);
        }

        return Array.from(grouped.entries()).map(([schoolName, schoolEvents]) => {
            const byExamType = new Map<string, EventItem[]>();
            for (const event of schoolEvents) {
                for (const examType of getEventExamTypes(event)) {
                    const current = byExamType.get(examType) ?? [];
                    current.push(event);
                    byExamType.set(examType, current);
                }
            }
            return { schoolName, byExamType };
        });
    }, [filteredEvents]);

    const ganttData = useMemo(() => {
        const dated = filteredEvents
            .map((event) => ({ ...event, parsedDate: new Date(event.date) }))
            .filter((event) => !Number.isNaN(event.parsedDate.getTime()))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

        if (dated.length === 0) return { rows: [], minTs: 0, maxTs: 0, span: 1 };

        const minTs = dated[0].parsedDate.getTime();
        const maxTs = dated[dated.length - 1].parsedDate.getTime();
        const span = Math.max(maxTs - minTs, 24 * 60 * 60 * 1000);

        const rows = dated.map((event) => {
            const start = event.parsedDate.getTime();
            const leftPct = ((start - minTs) / span) * 100;
            return {
                id: event.id,
                title: event.title,
                schoolName: event.school?.name || "Sin sede",
                dateLabel: event.parsedDate.toLocaleDateString("es-MX"),
                leftPct: Math.max(0, Math.min(leftPct, 100)),
                widthPct: 8, // one-day marker style
            };
        });

        return { rows, minTs, maxTs, span };
    }, [filteredEvents]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                    <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Documentos de Eventos</h1>
                    <p className="text-sm text-muted-foreground">
                        Módulo institucional para seguimiento documental por evento y por área.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Eventos y cobertura documental</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        Clic en un evento para abrir su ventana dedicada (tabs: Logística, Certificados, Resultados + checklist).
                    </p>
                    <div className="mt-3 flex flex-col gap-2 md:flex-row">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por evento, sede o tipo de examen..."
                            className="md:max-w-sm"
                        />
                        <Tabs value={mainView} onValueChange={(v) => setMainView(v as "events" | "schools" | "gantt")}>
                            <TabsList>
                                <TabsTrigger value="events">
                                    <List className="mr-1 h-4 w-4" />
                                    Eventos
                                </TabsTrigger>
                                <TabsTrigger value="schools">
                                    <Network className="mr-1 h-4 w-4" />
                                    Por escuela
                                </TabsTrigger>
                                <TabsTrigger value="gantt">
                                    <GanttChartSquare className="mr-1 h-4 w-4" />
                                    Gantt
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
                                <List className="mr-1 h-4 w-4" />
                                Lista
                            </Button>
                            <Button size="sm" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")}>
                                <Grid3X3 className="mr-1 h-4 w-4" />
                                Grid
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className={mainView === "events"
                    ? (view === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[74vh] overflow-auto md:grid-rows-none items-stretch" : "space-y-2 max-h-[74vh] overflow-auto")
                    : "space-y-3 max-h-[74vh] overflow-auto"}>
                    {(eventsLoading || docsLoading) && (
                        <p className="text-sm text-muted-foreground">Cargando eventos y documentos...</p>
                    )}
                    {!eventsLoading && filteredEvents.length === 0 && (
                        <p className="text-sm text-muted-foreground">No hay eventos disponibles.</p>
                    )}
                    {mainView === "events" && filteredEvents.map((event) => {
                        const areaCount = countByArea(docsByEvent.get(event.id) ?? []);
                        const gridCard = view === "grid" && mainView === "events";
                        return (
                            <button
                                key={event.id}
                                onClick={() => router.push(`/dashboard/institucional/documentos-eventos/${event.id}`)}
                                className={cn(
                                    "w-full rounded-lg border px-3 py-2 text-left transition cursor-pointer hover:bg-muted/50 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
                                    gridCard && "min-h-[11rem] h-full md:min-h-[10.5rem] flex flex-col justify-between gap-3"
                                )}
                            >
                                <div className={cn(
                                    "flex gap-2",
                                    gridCard
                                        ? "min-h-0 flex-1 flex-col md:flex-row md:items-stretch md:justify-between"
                                        : "flex-col md:flex-row md:items-start md:justify-between"
                                )}>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium break-words">{event.title}</p>
                                        <div
                                            className={cn(
                                                "mt-1 flex gap-x-3 gap-y-1 text-xs text-muted-foreground",
                                                gridCard ? "flex-wrap items-center" : "items-center"
                                            )}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {new Date(event.date).toLocaleDateString("es-MX")}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <School className="h-3.5 w-3.5" />
                                                {event.school?.name || "Sin sede"}
                                            </span>
                                            <span className="inline-flex gap-1">
                                                {getEventExamTypes(event).map((exam) => (
                                                    <Badge key={exam} variant="secondary" className="text-[10px] uppercase">
                                                        {exam === "sin-tipo" ? "Sin tipo" : exam}
                                                    </Badge>
                                                ))}
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            "flex flex-shrink-0 flex-wrap items-center gap-2",
                                            gridCard
                                                ? "justify-start md:max-w-[45%] md:flex-col md:items-end md:justify-center"
                                                : "justify-end md:max-w-[50%]"
                                        )}
                                    >
                                        <Badge variant="outline">Logística: {areaCount.logistics}</Badge>
                                        <Badge variant="outline">Certificados: {areaCount.certificates}</Badge>
                                        <Badge variant="outline">Resultados: {areaCount.results}</Badge>
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {mainView === "schools" && schoolsViewData.map(({ schoolName, byExamType }) => (
                        <Card key={schoolName}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{schoolName}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {Array.from(byExamType.entries()).map(([examType, examEvents]) => (
                                    <div key={examType} className="rounded border p-2">
                                        <div className="mb-2 flex items-center justify-between">
                                            <Badge>{examType === "sin-tipo" ? "SIN TIPO" : examType.toUpperCase()}</Badge>
                                            <span className="text-xs text-muted-foreground">{examEvents.length} evento(s)</span>
                                        </div>
                                        <div className="space-y-1">
                                            {examEvents.map((event) => (
                                                <button
                                                    key={`${examType}-${event.id}`}
                                                    onClick={() => router.push(`/dashboard/institucional/documentos-eventos/${event.id}`)}
                                                    className="w-full rounded border px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span>{event.title}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(event.date).toLocaleDateString("es-MX")}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}

                    {mainView === "gantt" && (
                        <div className="space-y-2">
                            {ganttData.rows.map((row) => (
                                <button
                                    key={row.id}
                                    onClick={() => router.push(`/dashboard/institucional/documentos-eventos/${row.id}`)}
                                    className="w-full rounded-lg border p-3 text-left hover:bg-muted/40"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="font-medium">{row.title}</span>
                                        <span className="text-xs text-muted-foreground">{row.dateLabel}</span>
                                    </div>
                                    <div className="relative h-3 rounded bg-muted">
                                        <div
                                            className="absolute h-3 rounded bg-primary/80"
                                            style={{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{row.schoolName}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

