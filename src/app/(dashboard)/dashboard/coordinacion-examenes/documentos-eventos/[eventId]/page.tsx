"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentUpload } from "@/components/documents/DocumentPanel";
import { EventDocumentsChecklist } from "@/components/events/event-documents-checklist";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Doc = {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    tags?: string[];
    created_at: string;
};

function sizeLabel(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getDocExamType(doc: Doc): string | null {
    const tag = (doc.tags ?? []).find((t) => String(t).toLowerCase().startsWith("exam-type:"));
    if (!tag) return null;
    return String(tag).split(":")[1]?.toLowerCase() || null;
}

function byArea(docs: Doc[], area: "logistics" | "certificates" | "results", examType: string) {
    const areaTag =
        area === "logistics" ? "event-logistics" : area === "certificates" ? "event-certificate" : "event-results";
    const patterns =
        area === "logistics"
            ? ["timetable", "attendance", "coe", "desk", "label"]
            : area === "certificates"
                ? ["certificate", "certificado"]
                : ["result", "resultado", "mark_sheet", "mark sheet"];

    return docs.filter((doc) => {
        const tags = new Set((doc.tags ?? []).map((t) => String(t).toLowerCase()));
        if (tags.has(areaTag)) return true;
        const name = doc.file_name.toLowerCase();
        const areaMatch = patterns.some((p) => name.includes(p));
        if (!areaMatch && !tags.has(areaTag)) return false;
        if (examType === "all") return true;
        const fromTag = getDocExamType(doc);
        if (fromTag) return fromTag === examType;
        return name.includes(examType);
    });
}

function DocsTable({ docs, onDelete }: { docs: Doc[]; onDelete: (id: string) => void }) {
    if (docs.length === 0) {
        return <p className="text-sm text-muted-foreground">Sin documentos en esta área.</p>;
    }

    return (
        <div className="rounded-lg border overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tamaño</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {docs.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.file_name}</TableCell>
                            <TableCell>{new Date(doc.created_at).toLocaleDateString("es-MX")}</TableCell>
                            <TableCell>{sizeLabel(doc.file_size ?? 0)}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {(doc.tags ?? []).map((tag) => (
                                        <Badge key={tag} variant="outline">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="inline-flex items-center gap-1">
                                    <Button size="icon" variant="ghost" asChild>
                                        <a href={`/api/v1/documents/download?path=${encodeURIComponent(doc.file_path)}`} target="_blank" rel="noreferrer">
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => onDelete(doc.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default function EventDocumentsDetailPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.eventId as string;

    const { data: eventData } = useSWR(`/api/v1/events/${eventId}`, fetcher);
    const { data: docsData, mutate } = useSWR(`/api/v1/documents?module=events&record_id=${eventId}`, fetcher);
    const [activeTab, setActiveTab] = useState<"logistics" | "certificates" | "results">("logistics");
    const [activeExamType, setActiveExamType] = useState<string>("all");

    const docs: Doc[] = docsData?.documents ?? [];
    const examTypeOptions = useMemo((): string[] => {
        const sessions = (eventData?.event?.sessions ?? []) as Array<{ exam_type?: string | null }>;
        const lowered = sessions.map((s) => String(s.exam_type ?? "").toLowerCase());
        return [...new Set(lowered.filter((t) => t.length > 0))];
    }, [eventData?.event?.sessions]);

    const logisticsDocs = useMemo(() => byArea(docs, "logistics", activeExamType), [docs, activeExamType]);
    const certificatesDocs = useMemo(() => byArea(docs, "certificates", activeExamType), [docs, activeExamType]);
    const resultsDocs = useMemo(() => byArea(docs, "results", activeExamType), [docs, activeExamType]);

    const eventTitle = eventData?.event?.name || eventData?.event?.title || `Evento ${eventId.slice(0, 8)}`;

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este documento?")) return;
        const res = await fetch(`/api/v1/documents?id=${id}`, { method: "DELETE" });
        if (res.ok) mutate();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/coordinacion-examenes/documentos-eventos")}>
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Volver a Documentos de Eventos
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">{eventTitle}</h1>
                </div>
                <Button asChild variant="outline">
                    <a href={`/dashboard/eventos/planner/${eventId}`}>Abrir Planner</a>
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Gestión por áreas (vista tabular)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Tipo de examen:</span>
                        <Select value={activeExamType} onValueChange={setActiveExamType}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {examTypeOptions.map((exam) => (
                                    <SelectItem key={exam} value={exam}>
                                        {exam.toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "logistics" | "certificates" | "results")} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="logistics">Logística</TabsTrigger>
                            <TabsTrigger value="certificates">Certificados</TabsTrigger>
                            <TabsTrigger value="results">Resultados</TabsTrigger>
                        </TabsList>

                        <TabsContent value="logistics" className="space-y-4 pt-4">
                            <DocumentUpload
                                moduleSlug="events"
                                recordId={eventId}
                                defaultTags={activeExamType === "all" ? ["event-logistics"] : ["event-logistics", `exam-type:${activeExamType}`]}
                                onUpload={() => mutate()}
                            />
                            <DocsTable docs={logisticsDocs} onDelete={handleDelete} />
                        </TabsContent>

                        <TabsContent value="certificates" className="space-y-4 pt-4">
                            <DocumentUpload
                                moduleSlug="events"
                                recordId={eventId}
                                defaultTags={activeExamType === "all" ? ["event-certificate"] : ["event-certificate", `exam-type:${activeExamType}`]}
                                onUpload={() => mutate()}
                            />
                            <DocsTable docs={certificatesDocs} onDelete={handleDelete} />
                        </TabsContent>

                        <TabsContent value="results" className="space-y-4 pt-4">
                            <DocumentUpload
                                moduleSlug="events"
                                recordId={eventId}
                                defaultTags={activeExamType === "all" ? ["event-results"] : ["event-results", `exam-type:${activeExamType}`]}
                                onUpload={() => mutate()}
                            />
                            <DocsTable docs={resultsDocs} onDelete={handleDelete} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <EventDocumentsChecklist eventId={eventId} area={activeTab} examType={activeExamType} />
        </div>
    );
}
