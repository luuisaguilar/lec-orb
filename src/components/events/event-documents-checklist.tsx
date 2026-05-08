"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChecklistArea = "all" | "logistics" | "certificates" | "results";

const CHECKLIST_ITEMS = [
    { area: "logistics", keys: ["attendance", "attendance-list"], namePatterns: ["attendance"], label: "Attendance (asistencia)", required: true },
    { area: "logistics", keys: ["coe"], namePatterns: ["coe", "confirmation of entry"], label: "CoE / Confirmation of Entry", required: true },
    { area: "logistics", keys: ["desk-label"], namePatterns: ["desk label", "desk_label"], label: "Desk label (etiquetas por candidato)", required: true },
    { area: "results", keys: ["mark-sheet"], namePatterns: ["mark_sheet", "mark sheet"], label: "Mark Sheet", required: true },
    { area: "logistics", keys: ["timetable-report"], namePatterns: ["timetable_report"], label: "Timetable Report general", required: true },
    {
        area: "logistics",
        keys: ["timetable-listening"],
        namePatterns: ["timetable_report listening"],
        label: "Timetable LISTENING (SALON 1/2 + SUP)",
        required: true,
    },
    {
        area: "logistics",
        keys: ["timetable-reading-writing"],
        namePatterns: ["timetable_report reading writing"],
        label: "Timetable READING WRITING (SALON 1/2 + SUP)",
        required: true,
    },
    {
        area: "logistics",
        keys: ["timetable-speaking"],
        namePatterns: ["timetable_report speaking"],
        label: "Timetable SPEAKING (SALON 1/2 + SUP)",
        required: true,
    },
    { area: "results", keys: ["results-report"], namePatterns: ["results", "resultado"], label: "Resultados consolidados", required: false },
    { area: "certificates", keys: ["certificates-batch"], namePatterns: ["certificate", "certificado"], label: "Certificados descargables", required: false },
] as const;

type Props = {
    eventId: string;
    area?: ChecklistArea;
    examType?: string;
};

export function EventDocumentsChecklist({ eventId, area = "all", examType = "all" }: Props) {
    const { data } = useSWR(`/api/v1/documents?module=events&record_id=${eventId}`, fetcher);
    const documents = data?.documents ?? [];

    const scopedDocs =
        examType === "all"
            ? documents
            : documents.filter((doc: any) => {
                const rawTags = (doc.tags ?? []).map((t: any) => String(t).toLowerCase());
                const examTag = rawTags.find((t: string) => t.startsWith("exam-type:"));
                const fileName = String(doc.file_name ?? "").toLowerCase();
                if (examTag) return examTag === `exam-type:${examType.toLowerCase()}`;
                return fileName.includes(examType.toLowerCase());
            });

    const tags = new Set<string>();
    const fileNames = scopedDocs.map((doc: any) => String(doc.file_name ?? "").toLowerCase());
    for (const doc of scopedDocs) {
        for (const t of doc.tags ?? []) tags.add(String(t));
    }

    const scopedItems = area === "all" ? CHECKLIST_ITEMS : CHECKLIST_ITEMS.filter((x) => x.area === area);
    const requiredItems = scopedItems.filter((x) => x.required);
    const isDone = (item: (typeof CHECKLIST_ITEMS)[number]) => {
        const byTag = item.keys.some((k) => tags.has(k));
        const byName = item.namePatterns.some((pattern) => fileNames.some((name: string) => name.includes(pattern)));
        return byTag || byName;
    };
    const requiredDone = requiredItems.filter((x) => isDone(x)).length;
    const progress = requiredItems.length === 0 ? 0 : Math.round((requiredDone / requiredItems.length) * 100);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span>Checklist documental del evento</span>
                    <Badge variant="outline">{requiredDone}/{requiredItems.length} obligatorios</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="space-y-2">
                    {scopedItems.map((item) => {
                        const done = isDone(item);
                        return (
                            <div
                                key={item.label}
                                className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {done ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                    ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="truncate">{item.label}</span>
                                </div>
                                <Badge variant={item.required ? "default" : "secondary"}>
                                    {item.required ? "Obligatorio" : "Opcional"}
                                </Badge>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

