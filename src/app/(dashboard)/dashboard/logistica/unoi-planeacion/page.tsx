"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ExternalLink, Grid3x3, LayoutGrid, Link2, ListFilter, Loader2, Table2, Upload, X } from "lucide-react";

type PlanningRow = {
    id: string;
    city: string | null;
    project: string;
    school_name: string;
    nivel: string | null;
    exam_type: string;
    students_planned: number | null;
    proposed_date: string;
    propuesta: string | null;
    external_status: string | null;
    resultados: string | null;
    planning_status: "proposed" | "linked" | "confirmed" | "rescheduled" | "cancelled";
    event_id: string | null;
    event_session_id: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EXAM_MATRIX_ORDER = ["starters", "movers", "flyers", "ket", "pet", "fce"];

function sortExamCols(exams: string[]) {
    return [...exams].sort((a, b) => {
        const ia = EXAM_MATRIX_ORDER.indexOf(a.toLowerCase());
        const ib = EXAM_MATRIX_ORDER.indexOf(b.toLowerCase());
        const sa = ia === -1 ? 999 : ia;
        const sb = ib === -1 ? 999 : ib;
        if (sa !== sb) return sa - sb;
        return a.localeCompare(b, "es", { sensitivity: "base" });
    });
}

function pivotKey(row: PlanningRow) {
    return [row.city ?? "", row.project, row.school_name, row.nivel ?? ""].join("\0");
}

type PivotSchoolRow = {
    key: string;
    city: string | null;
    project: string;
    school_name: string;
    nivel: string | null;
    byExam: Map<string, PlanningRow[]>;
};

function buildPivot(rows: PlanningRow[]) {
    const examSet = new Set<string>();
    const groups = new Map<string, PivotSchoolRow>();
    for (const row of rows) {
        const ex = row.exam_type.toLowerCase();
        examSet.add(ex);
        const k = pivotKey(row);
        let g = groups.get(k);
        if (!g) {
            g = {
                key: k,
                city: row.city,
                project: row.project,
                school_name: row.school_name,
                nivel: row.nivel,
                byExam: new Map(),
            };
            groups.set(k, g);
        }
        const arr = g.byExam.get(ex) ?? [];
        arr.push(row);
        g.byExam.set(ex, arr);
    }
    const examCols = sortExamCols([...examSet]);
    const pivotRows = [...groups.values()].sort((a, b) => {
        const c = a.school_name.localeCompare(b.school_name, "es", { sensitivity: "base" });
        if (c !== 0) return c;
        return (a.city ?? "").localeCompare(b.city ?? "", "es");
    });
    return { pivotRows, examCols };
}

/** Borde / tinte por tipo de examen (alineado al Excel UNOi / vista eventos). */
const EXAM_ROW_ACCENT: Record<string, string> = {
    starters: "border-l-yellow-400 bg-yellow-400/[0.07]",
    movers: "border-l-orange-400 bg-orange-400/[0.07]",
    flyers: "border-l-lime-500 bg-lime-500/[0.08]",
    ket: "border-l-sky-500 bg-sky-500/[0.08]",
    pet: "border-l-violet-500 bg-violet-500/[0.08]",
    fce: "border-l-amber-600 bg-amber-600/[0.10]",
};

const EXAM_PILL: Record<string, string> = {
    starters: "bg-sky-100 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100",
    movers: "bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100",
    flyers: "bg-lime-100 text-lime-950 dark:bg-lime-950/40 dark:text-lime-100",
    ket: "bg-sky-200/80 text-sky-950 dark:bg-sky-900/50 dark:text-sky-100",
    pet: "bg-violet-100 text-violet-950 dark:bg-violet-950/40 dark:text-violet-100",
    fce: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
};

const EXAM_HEADER_BG: Record<string, string> = {
    starters: "bg-sky-600 text-white dark:bg-sky-800",
    movers: "bg-orange-600 text-white dark:bg-orange-900",
    flyers: "bg-lime-600 text-white dark:bg-lime-900",
    ket: "bg-sky-700 text-white dark:bg-sky-950",
    pet: "bg-violet-600 text-white dark:bg-violet-900",
    fce: "bg-amber-700 text-white dark:bg-amber-950",
};

function examAccent(exam: string) {
    const k = exam?.toLowerCase() ?? "";
    return EXAM_ROW_ACCENT[k] ?? "border-l-muted-foreground/40 bg-muted/30";
}

function examPill(exam: string) {
    const k = exam?.toLowerCase() ?? "";
    return EXAM_PILL[k] ?? "bg-muted text-muted-foreground";
}

function examHeaderBg(exam: string) {
    const k = exam?.toLowerCase() ?? "";
    return EXAM_HEADER_BG[k] ?? "bg-slate-600 text-white dark:bg-slate-800";
}

/** Solo el fondo suave (para filas de tabla). */
function examRowBg(exam: string) {
    const k = exam?.toLowerCase() ?? "";
    const map: Record<string, string> = {
        starters: "bg-yellow-400/[0.06]",
        movers: "bg-orange-400/[0.06]",
        flyers: "bg-lime-500/[0.07]",
        ket: "bg-sky-500/[0.07]",
        pet: "bg-violet-500/[0.07]",
        fce: "bg-amber-600/[0.08]",
    };
    return map[k] ?? "bg-muted/25";
}

function PlanningStatusBadge({ status }: { status: PlanningRow["planning_status"] }) {
    if (status === "linked" || status === "confirmed") {
        return (
            <Badge
                className={cn(
                    "shrink-0 border-0 text-[10px] font-semibold uppercase tracking-wide",
                    "bg-red-900 text-white hover:bg-red-900 dark:bg-red-950"
                )}
            >
                {status}
            </Badge>
        );
    }
    if (status === "proposed") {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "shrink-0 border-border bg-muted/80 text-foreground text-[10px] font-semibold uppercase tracking-wide"
                )}
            >
                {status}
            </Badge>
        );
    }
    if (status === "cancelled") {
        return (
            <Badge variant="destructive" className="shrink-0 text-[10px] font-semibold uppercase tracking-wide">
                {status}
            </Badge>
        );
    }
    return (
        <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold uppercase tracking-wide">
            {status}
        </Badge>
    );
}

export type TableColumnFilters = {
    fecha: string;
    city: string;
    project: string;
    colegio: string;
    nivel: string;
    examen: string;
    alumnos: string;
    estado: string;
    vinculo: "all" | "yes" | "no";
};

function rowMatchesQuickTableSearch(row: PlanningRow, q: string): boolean {
    if (!q.trim()) return true;
    const n = q.trim().toLowerCase();
    const blob = [
        row.proposed_date,
        row.city,
        row.project,
        row.school_name,
        row.nivel,
        row.exam_type,
        String(row.students_planned ?? ""),
        row.planning_status,
        row.event_id ? "vinculado evento" : "",
    ]
        .join(" ")
        .toLowerCase();
    return blob.includes(n);
}

function rowMatchesTableFilters(row: PlanningRow, f: TableColumnFilters): boolean {
    const inc = (hay: string | null | undefined, needle: string) =>
        needle.trim() === "" || (hay ?? "").toLowerCase().includes(needle.trim().toLowerCase());
    if (!inc(row.proposed_date, f.fecha)) return false;
    if (!inc(row.city, f.city)) return false;
    if (!inc(row.project, f.project)) return false;
    if (!inc(row.school_name, f.colegio)) return false;
    if (!inc(row.nivel, f.nivel)) return false;
    if (!inc(row.exam_type, f.examen)) return false;
    if (f.alumnos.trim() && !String(row.students_planned ?? "").includes(f.alumnos.trim())) return false;
    if (!inc(row.planning_status, f.estado)) return false;
    if (f.vinculo === "yes" && !row.event_id) return false;
    if (f.vinculo === "no" && row.event_id) return false;
    return true;
}

const defaultTableFilters: TableColumnFilters = {
    fecha: "",
    city: "",
    project: "",
    colegio: "",
    nivel: "",
    examen: "",
    alumnos: "",
    estado: "",
    vinculo: "all",
};

function EventPlannerLink({ eventId, className }: { eventId: string; className?: string }) {
    return (
        <Link
            href={`/dashboard/eventos/planner/${eventId}`}
            className={cn(
                "inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline",
                className
            )}
        >
            Abrir evento
            <ExternalLink className="h-3 w-3 opacity-70" />
        </Link>
    );
}

export type TableColumnFilterKey = keyof TableColumnFilters;

/** Botón en encabezado: abre un diálogo global (evita Radix dentro de <th>). */
function ColumnFilterHeaderButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/20 hover:text-white",
                active && "bg-white/25 text-white ring-1 ring-white/50"
            )}
            aria-label="Filtrar esta columna"
        >
            <ListFilter className="h-3.5 w-3.5" />
        </button>
    );
}

/** Un solo Dialog para todos los filtros de columna (fuera de la tabla). */
function PlanningColumnFilterDialog({
    columnKey,
    onClose,
    filters,
    setPatch,
}: {
    columnKey: TableColumnFilterKey | null;
    onClose: () => void;
    filters: TableColumnFilters;
    setPatch: (p: Partial<TableColumnFilters>) => void;
}) {
    const open = columnKey !== null;

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) onClose();
            }}
        >
            <DialogContent className="sm:max-w-md" showCloseButton>
                {columnKey === "vinculo" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Filtro: Evento</DialogTitle>
                            <DialogDescription>Filtra filas según si ya tienen evento vinculado en Orb.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 py-2">
                            <Label>Vinculación</Label>
                            <Select
                                value={filters.vinculo}
                                onValueChange={(v) => setPatch({ vinculo: v as TableColumnFilters["vinculo"] })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="yes">Con evento</SelectItem>
                                    <SelectItem value="no">Sin evento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPatch({ vinculo: "all" })}
                                disabled={filters.vinculo === "all"}
                            >
                                Quitar filtro
                            </Button>
                            <Button type="button" onClick={onClose}>
                                Listo
                            </Button>
                        </DialogFooter>
                    </>
                ) : columnKey ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                Filtro:{" "}
                                {columnKey === "fecha"
                                    ? "Fecha"
                                    : columnKey === "city"
                                      ? "City"
                                      : columnKey === "project"
                                        ? "Proyecto"
                                        : columnKey === "colegio"
                                          ? "Colegio"
                                          : columnKey === "nivel"
                                            ? "Nivel"
                                            : columnKey === "examen"
                                              ? "Examen"
                                              : columnKey === "alumnos"
                                                ? "Alumnos"
                                                : "Estado"}
                            </DialogTitle>
                            <DialogDescription>
                                Coincidencia parcial en el texto, sin distinguir mayúsculas. La tabla se actualiza al
                                escribir.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 py-2">
                            <Label>Contiene</Label>
                            <Input
                                value={String(filters[columnKey])}
                                onChange={(e) => setPatch({ [columnKey]: e.target.value } as Partial<TableColumnFilters>)}
                                placeholder={
                                    columnKey === "fecha"
                                        ? "2026-05-23…"
                                        : columnKey === "examen"
                                          ? "ket, fce…"
                                          : columnKey === "alumnos"
                                            ? "20…"
                                            : columnKey === "estado"
                                              ? "linked, proposed…"
                                              : "…"
                                }
                                autoComplete="off"
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPatch({ [columnKey]: "" } as Partial<TableColumnFilters>)}
                                disabled={!String(filters[columnKey]).trim()}
                            >
                                Quitar filtro
                            </Button>
                            <Button type="button" onClick={onClose}>
                                Cerrar
                            </Button>
                        </DialogFooter>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Scroll horizontal: el contenido usa w-max para que la tabla no se comprima;
 * barra superior sincronizada (misma anchura útil que el área inferior).
 */
function SyncedHorizontalScroll({
    children,
    depsKey,
    verticalScrollClassName,
}: {
    children: ReactNode;
    depsKey: string | number;
    /** Si se define, el área con scroll horizontal queda dentro de un contenedor con scroll vertical (p. ej. max-h + overflow-y-auto). */
    verticalScrollClassName?: string;
}) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const [scrollWidth, setScrollWidth] = useState(0);

    useLayoutEffect(() => {
        const inner = innerRef.current;
        if (!inner) return;
        const measure = () => setScrollWidth(inner.scrollWidth);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(inner);
        return () => ro.disconnect();
    }, [depsKey]);

    const onBottomScroll = () => {
        const t = topRef.current;
        const b = bottomRef.current;
        if (!t || !b) return;
        if (t.scrollLeft !== b.scrollLeft) t.scrollLeft = b.scrollLeft;
    };

    const onTopScroll = () => {
        const t = topRef.current;
        const b = bottomRef.current;
        if (!t || !b) return;
        if (b.scrollLeft !== t.scrollLeft) b.scrollLeft = t.scrollLeft;
    };

    const bottom = (
        <div
            ref={bottomRef}
            className="max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain"
            onScroll={onBottomScroll}
        >
            <div ref={innerRef} className="w-max min-w-full">
                {children}
            </div>
        </div>
    );

    return (
        <div className="relative">
            <div
                ref={topRef}
                className="mb-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-t-md border border-b-0 border-border/60 bg-muted/40"
                style={{ minHeight: 16 }}
                onScroll={onTopScroll}
                aria-label="Desplazamiento horizontal (arriba)"
            >
                <div style={{ width: scrollWidth, height: 12 }} className="shrink-0" aria-hidden />
            </div>
            {verticalScrollClassName ? (
                <div className={cn("overflow-y-auto overscroll-y-contain", verticalScrollClassName)}>{bottom}</div>
            ) : (
                bottom
            )}
        </div>
    );
}

export default function UNOiPlanningPage() {
    const [city, setCity] = useState("");
    const [school, setSchool] = useState("");
    const [status, setStatus] = useState("");
    const [q, setQ] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [replaceByFileName, setReplaceByFileName] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [tableFilters, setTableFilters] = useState<TableColumnFilters>(defaultTableFilters);
    const [quickTableSearch, setQuickTableSearch] = useState("");
    const [columnFilterDialog, setColumnFilterDialog] = useState<TableColumnFilterKey | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    const [bulkLinking, setBulkLinking] = useState(false);

    const qs = useMemo(() => {
        const p = new URLSearchParams();
        if (city.trim()) p.set("city", city.trim());
        if (school.trim()) p.set("school", school.trim());
        if (status.trim()) p.set("status", status.trim());
        if (q.trim()) p.set("q", q.trim());
        return p.toString();
    }, [city, school, status, q]);

    const { data, isLoading, mutate } = useSWR<{ rows: PlanningRow[]; total: number }>(
        `/api/v1/planning/unoi${qs ? `?${qs}` : ""}`,
        fetcher
    );
    const rows = useMemo(() => data?.rows ?? [], [data]);

    const rowsForViews = useMemo(
        () =>
            rows.filter(
                (r) => rowMatchesTableFilters(r, tableFilters) && rowMatchesQuickTableSearch(r, quickTableSearch)
            ),
        [rows, tableFilters, quickTableSearch]
    );

    useEffect(() => {
        const valid = new Set(rowsForViews.map((r) => r.id));
        setSelectedIds((prev) => {
            const nextArr = [...prev].filter((id) => valid.has(id));
            if (nextArr.length === prev.size && nextArr.every((id) => prev.has(id))) return prev;
            return new Set(nextArr);
        });
    }, [rowsForViews]);

    const unlinkedInViewCount = useMemo(
        () => rowsForViews.filter((r) => !r.event_id).length,
        [rowsForViews]
    );

    const activeTableFilterChips = useMemo(() => {
        const chips: { key: keyof TableColumnFilters; label: string; value: string }[] = [];
        const f = tableFilters;
        if (f.fecha.trim()) chips.push({ key: "fecha", label: "Fecha", value: f.fecha.trim() });
        if (f.city.trim()) chips.push({ key: "city", label: "City", value: f.city.trim() });
        if (f.project.trim()) chips.push({ key: "project", label: "Proyecto", value: f.project.trim() });
        if (f.colegio.trim()) chips.push({ key: "colegio", label: "Colegio", value: f.colegio.trim() });
        if (f.nivel.trim()) chips.push({ key: "nivel", label: "Nivel", value: f.nivel.trim() });
        if (f.examen.trim()) chips.push({ key: "examen", label: "Examen", value: f.examen.trim() });
        if (f.alumnos.trim()) chips.push({ key: "alumnos", label: "Alumnos", value: f.alumnos.trim() });
        if (f.estado.trim()) chips.push({ key: "estado", label: "Estado", value: f.estado.trim() });
        if (f.vinculo === "yes") chips.push({ key: "vinculo", label: "Evento", value: "Con evento" });
        if (f.vinculo === "no") chips.push({ key: "vinculo", label: "Evento", value: "Sin evento" });
        return chips;
    }, [tableFilters]);

    const clearTableFilterKey = (key: keyof TableColumnFilters) => {
        if (key === "vinculo") setTableFilters((p) => ({ ...p, vinculo: "all" }));
        else setTableFilters((p) => ({ ...p, [key]: "" }));
    };

    const groupedByDate = useMemo(() => {
        const g = new Map<string, PlanningRow[]>();
        for (const row of rowsForViews) {
            const k = row.proposed_date;
            const arr = g.get(k) ?? [];
            arr.push(row);
            g.set(k, arr);
        }
        return [...g.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [rowsForViews]);

    const tableRowsSorted = useMemo(() => {
        return [...rowsForViews].sort((a, b) => {
            const d = a.proposed_date.localeCompare(b.proposed_date);
            if (d !== 0) return d;
            return a.school_name.localeCompare(b.school_name, "es");
        });
    }, [rowsForViews]);

    const tableVisibleSelectedCount = useMemo(
        () => tableRowsSorted.reduce((n, r) => n + (selectedIds.has(r.id) ? 1 : 0), 0),
        [tableRowsSorted, selectedIds]
    );
    const allTableVisibleSelected =
        tableRowsSorted.length > 0 && tableVisibleSelectedCount === tableRowsSorted.length;
    const someTableVisibleSelected =
        tableVisibleSelectedCount > 0 && !allTableVisibleSelected;

    const { pivotRows, examCols } = useMemo(() => buildPivot(rowsForViews), [rowsForViews]);

    const setTbl = (patch: Partial<TableColumnFilters>) =>
        setTableFilters((prev) => ({ ...prev, ...patch }));

    const linkRow = async (row: PlanningRow) => {
        setBusyId(row.id);
        try {
            const res = await fetch(`/api/v1/planning/unoi/${row.id}/link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ createIfMissing: true }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || "No se pudo vincular el evento");
            }
            await mutate();
        } catch (e: any) {
            alert(e.message || "Error al vincular");
        } finally {
            setBusyId(null);
        }
    };

    const toggleRowSelected = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllVisibleInTable = () => setSelectedIds(new Set(tableRowsSorted.map((r) => r.id)));

    const selectUnlinkedVisibleInTable = () =>
        setSelectedIds(new Set(tableRowsSorted.filter((r) => !r.event_id).map((r) => r.id)));

    const clearRowSelection = () => setSelectedIds(new Set());

    const runLinkForIds = async (ids: string[]) => {
        let ok = 0;
        let err = 0;
        for (const id of ids) {
            try {
                const res = await fetch(`/api/v1/planning/unoi/${id}/link`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ createIfMissing: true }),
                });
                if (res.ok) ok++;
                else err++;
            } catch {
                err++;
            }
        }
        await mutate();
        return { ok, err };
    };

    const linkSelectedBulk = async () => {
        const ids = [...selectedIds];
        if (ids.length === 0) return;
        setBulkLinking(true);
        try {
            const { ok, err } = await runLinkForIds(ids);
            clearRowSelection();
            if (err) toast.warning(`Vinculados: ${ok}. Fallaron: ${err}.`);
            else toast.success(`Vinculados: ${ok} fila(s).`);
        } finally {
            setBulkLinking(false);
        }
    };

    const linkAllUnlinkedInView = async () => {
        const targets = rowsForViews.filter((r) => !r.event_id).map((r) => r.id);
        if (targets.length === 0) {
            toast.info("No hay filas sin evento en esta vista.");
            return;
        }
        if (targets.length > 12) {
            const ok = window.confirm(`¿Vincular ${targets.length} filas sin evento en la vista actual?`);
            if (!ok) return;
        }
        setBulkLinking(true);
        try {
            const { ok, err } = await runLinkForIds(targets);
            clearRowSelection();
            if (err) toast.warning(`Vinculados: ${ok}. Fallaron: ${err}.`);
            else toast.success(`Vinculados: ${ok} fila(s).`);
        } finally {
            setBulkLinking(false);
        }
    };

    const uploadPlanningFile = async () => {
        if (!uploadFile) {
            alert("Selecciona un archivo .xlsx");
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", uploadFile);
            fd.append("replace", replaceByFileName ? "true" : "false");
            const res = await fetch("/api/v1/planning/unoi/import", {
                method: "POST",
                body: fd,
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload.error || "No se pudo importar el archivo");
            }
            alert(`Importación completada. Insertadas: ${payload.inserted ?? 0}`);
            setUploadFile(null);
            setImportDialogOpen(false);
            await mutate();
        } catch (e: any) {
            alert(e.message || "Error al importar");
        } finally {
            setUploading(false);
        }
    };

    const filterHint =
        rows.length !== rowsForViews.length ? (
            <span className="text-muted-foreground">
                {" "}
                · Mostrando {rowsForViews.length} de {rows.length}
                {quickTableSearch.trim() ? " (búsqueda + filtros)" : " (filtros de tabla)"}
            </span>
        ) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Planeación UNOi</h1>
                    <p className="text-sm text-muted-foreground">
                        Planeación recibida de Sistema Uno (UNOi), separada de Eventos. Puedes vincular cada fila a un
                        evento/sesión.
                    </p>
                </div>
                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="shrink-0 gap-2">
                            <Upload className="h-4 w-4" />
                            Importar Excel
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md" showCloseButton>
                        <DialogHeader>
                            <DialogTitle>Importar Excel UNOi</DialogTitle>
                            <DialogDescription>
                                Archivo IH (hoja <strong>Colegios_Propuestas_Fechas</strong>). Se guarda en este módulo.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-1">
                            <div className="space-y-1">
                                <Label>Archivo .xlsx / .xls</Label>
                                <Input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={replaceByFileName}
                                    onChange={(e) => setReplaceByFileName(e.target.checked)}
                                />
                                Reemplazar filas previas con el mismo nombre de archivo
                            </label>
                            {uploadFile ? (
                                <p className="truncate text-xs text-muted-foreground">{uploadFile.name}</p>
                            ) : null}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setImportDialogOpen(false)}
                                disabled={uploading}
                            >
                                Cancelar
                            </Button>
                            <Button type="button" onClick={uploadPlanningFile} disabled={!uploadFile || uploading}>
                                {uploading ? "Importando…" : "Importar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                    <CardDescription>Filtra por ciudad, colegio, estatus o texto libre (consulta al servidor).</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                        <Label>Ciudad</Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="HMO, OBRE..." />
                    </div>
                    <div className="space-y-1">
                        <Label>Colegio</Label>
                        <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Nombre colegio" />
                    </div>
                    <div className="space-y-1">
                        <Label>Estatus</Label>
                        <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="proposed / linked..." />
                    </div>
                    <div className="space-y-1">
                        <Label>Búsqueda</Label>
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="exam, propuesta..." />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="space-y-1">
                    <CardTitle>Calendario / Grid</CardTitle>
                    <CardDescription>
                        {isLoading ? "Cargando..." : `${rows.length} filas cargadas`}
                        {groupedByDate.length > 0 && !isLoading && (
                            <span className="text-muted-foreground"> · {groupedByDate.length} fechas en vista</span>
                        )}
                        {filterHint}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="grid" className="w-full gap-4">
                        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
                            <TabsTrigger value="grid" className="gap-1.5">
                                <LayoutGrid className="h-3.5 w-3.5" />
                                Por fecha
                            </TabsTrigger>
                            <TabsTrigger value="table" className="gap-1.5">
                                <Table2 className="h-3.5 w-3.5" />
                                Tabla estilo plan
                            </TabsTrigger>
                            <TabsTrigger value="matrix" className="gap-1.5">
                                <Grid3x3 className="h-3.5 w-3.5" />
                                Matriz por examen
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="grid" className="mt-0">
                            <p className="mb-3 text-xs text-muted-foreground">
                                Los filtros de la pestaña <strong>Tabla estilo plan</strong> (icono junto a cada columna, búsqueda rápida y chips) aplican también aquí.
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {groupedByDate.map(([date, dateRows]) => (
                                    <div
                                        key={date}
                                        className="rounded-xl border border-border/80 bg-card p-3 shadow-sm"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                                            <p className="font-mono text-sm font-semibold tracking-tight text-foreground">
                                                {date}
                                            </p>
                                            <Badge variant="secondary" className="font-normal tabular-nums">
                                                {dateRows.length} filas
                                            </Badge>
                                        </div>
                                        <div className="max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto pr-0.5">
                                            {dateRows.map((row) => (
                                                <div
                                                    key={row.id}
                                                    className={cn(
                                                        "space-y-2 rounded-lg border border-border/70 bg-background/90 p-2.5 shadow-sm",
                                                        "border-l-[3px]",
                                                        examAccent(row.exam_type)
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-bold uppercase leading-snug tracking-tight text-foreground">
                                                            {row.school_name}
                                                        </p>
                                                        <PlanningStatusBadge status={row.planning_status} />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        <span className="font-medium text-foreground/80">
                                                            {row.city?.trim() || "—"}
                                                        </span>
                                                        <span className="mx-1.5 text-muted-foreground/70">·</span>
                                                        <span
                                                            className={cn(
                                                                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                                                examPill(row.exam_type)
                                                            )}
                                                        >
                                                            {row.exam_type}
                                                        </span>
                                                        <span className="mx-1.5 text-muted-foreground/70">·</span>
                                                        <span>{row.students_planned ?? 0} alumnos</span>
                                                        {row.nivel ? (
                                                            <>
                                                                <span className="mx-1.5 text-muted-foreground/70">·</span>
                                                                <span>{row.nivel}</span>
                                                            </>
                                                        ) : null}
                                                    </p>
                                                    {row.event_id ? (
                                                        <EventPlannerLink eventId={row.event_id} className="text-[11px]" />
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {!isLoading && rowsForViews.length === 0 && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No hay filas para los filtros seleccionados.
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="table" className="mt-0 space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div className="max-w-md flex-1 space-y-1">
                                    <Label className="text-xs text-muted-foreground">Búsqueda rápida en toda la tabla</Label>
                                    <Input
                                        className="h-9 text-sm"
                                        placeholder="Ej. OBRE, ket, 2026-05, vinculado…"
                                        value={quickTableSearch}
                                        onChange={(e) => setQuickTableSearch(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Filtra al escribir (fecha, ciudad, colegio, examen, alumnos, estado…). Combina con los filtros por columna.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 shrink-0 text-xs"
                                    onClick={() => {
                                        setTableFilters(defaultTableFilters);
                                        setQuickTableSearch("");
                                    }}
                                >
                                    Limpiar todo
                                </Button>
                            </div>

                            {(activeTableFilterChips.length > 0 || quickTableSearch.trim()) && (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2">
                                    <span className="text-xs font-medium text-muted-foreground">Filtros activos:</span>
                                    {quickTableSearch.trim() ? (
                                        <Badge variant="secondary" className="gap-1 pr-1 font-normal">
                                            <span className="max-w-[200px] truncate">Todo: &quot;{quickTableSearch.trim()}&quot;</span>
                                            <button
                                                type="button"
                                                className="rounded p-0.5 hover:bg-background/80"
                                                aria-label="Quitar búsqueda rápida"
                                                onClick={() => setQuickTableSearch("")}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ) : null}
                                    {activeTableFilterChips.map((c) => (
                                        <Badge key={c.key + c.value} variant="secondary" className="gap-1 pr-1 font-normal">
                                            <span>
                                                {c.label}: {c.value}
                                            </span>
                                            <button
                                                type="button"
                                                className="rounded p-0.5 hover:bg-background/80"
                                                aria-label={`Quitar filtro ${c.label}`}
                                                onClick={() => clearTableFilterKey(c.key)}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                Pulsa el icono{" "}
                                <ListFilter className="inline-block h-3 w-3 align-text-bottom text-muted-foreground" /> junto a
                                cada encabezado para abrir el cuadro de filtro. Con tabla ancha, desplaza con la barra
                                superior o la inferior (sincronizadas).
                            </p>

                            <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/25 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">{unlinkedInViewCount}</span> sin evento ·{" "}
                                    <span className="font-medium text-foreground">{tableRowsSorted.length}</span> en esta vista ·{" "}
                                    <span className="font-medium text-foreground">{selectedIds.size}</span> seleccionados
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        disabled={tableRowsSorted.length === 0 || bulkLinking}
                                        onClick={selectAllVisibleInTable}
                                    >
                                        Todas (vista)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        disabled={unlinkedInViewCount === 0 || bulkLinking}
                                        onClick={selectUnlinkedVisibleInTable}
                                    >
                                        Sin evento (vista)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs"
                                        disabled={selectedIds.size === 0 || bulkLinking}
                                        onClick={clearRowSelection}
                                    >
                                        Quitar selección
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 gap-1 text-xs"
                                        disabled={selectedIds.size === 0 || bulkLinking}
                                        onClick={linkSelectedBulk}
                                    >
                                        {bulkLinking ? (
                                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                        ) : (
                                            <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                        )}
                                        Vincular seleccionados
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-8 gap-1 text-xs"
                                        disabled={unlinkedInViewCount === 0 || bulkLinking}
                                        onClick={linkAllUnlinkedInView}
                                    >
                                        {bulkLinking ? (
                                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                        ) : (
                                            <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                        )}
                                        Todas sin evento (vista)
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border/80">
                                <SyncedHorizontalScroll
                                    depsKey={`${tableRowsSorted.length}-${rows.length}-${tableFilters.fecha}-${tableFilters.colegio}`}
                                    verticalScrollClassName="max-h-[min(72vh,44rem)]"
                                >
                                    <table className={cn("w-max min-w-full caption-bottom text-sm table-auto")}>
                                        <TableHeader className="sticky top-0 z-30 bg-emerald-800 dark:bg-emerald-950 [&_tr]:border-b-0">
                                            <TableRow className="border-b-0 bg-emerald-800 hover:bg-emerald-800 dark:bg-emerald-950">
                                                <TableHead className="w-10 min-w-10 max-w-10 px-2 text-center text-white">
                                                    <Checkbox
                                                        aria-label="Seleccionar todas las filas visibles"
                                                        checked={
                                                            allTableVisibleSelected
                                                                ? true
                                                                : someTableVisibleSelected
                                                                  ? "indeterminate"
                                                                  : false
                                                        }
                                                        onCheckedChange={(v) => {
                                                            if (v === true) selectAllVisibleInTable();
                                                            else clearRowSelection();
                                                        }}
                                                        disabled={tableRowsSorted.length === 0 || bulkLinking}
                                                        className="border-white/80 data-[state=checked]:bg-white data-[state=checked]:text-emerald-900"
                                                    />
                                                </TableHead>
                                                <TableHead className="min-w-[7.5rem] text-white font-semibold">
                                                    <div className="flex items-center justify-between gap-1 pr-0.5">
                                                        <span>Fecha</span>
                                                        <ColumnFilterHeaderButton
                                                            active={!!tableFilters.fecha.trim()}
                                                            onClick={() => setColumnFilterDialog("fecha")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[5rem] text-white font-semibold">
                                                    <div className="flex items-center justify-between gap-1 pr-0.5">
                                                        <span>City</span>
                                                        <ColumnFilterHeaderButton
                                                            active={!!tableFilters.city.trim()}
                                                            onClick={() => setColumnFilterDialog("city")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[5.5rem] text-white font-semibold">
                                                    <div className="flex items-center justify-between gap-1 pr-0.5">
                                                        <span>Proyecto</span>
                                                        <ColumnFilterHeaderButton
                                                            active={!!tableFilters.project.trim()}
                                                            onClick={() => setColumnFilterDialog("project")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[12rem] text-white font-semibold">
                                                    <div className="flex items-center justify-between gap-1 pr-0.5">
                                                        <span>Colegio</span>
                                                        <ColumnFilterHeaderButton
                                                            active={!!tableFilters.colegio.trim()}
                                                            onClick={() => setColumnFilterDialog("colegio")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[6rem] text-white font-semibold">
                                                    <div className="flex items-center justify-between gap-1 pr-0.5">
                                                        <span>Nivel</span>
                                                        <ColumnFilterHeaderButton
                                                            active={!!tableFilters.nivel.trim()}
                                                            onClick={() => setColumnFilterDialog("nivel")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[5.5rem] text-white font-semibold">
                                                    <div className="flex items-center justify-between gap-1 pr-0.5">
                                                        <span>Examen</span>
                                                        <ColumnFilterHeaderButton
                                                            active={!!tableFilters.examen.trim()}
                                                            onClick={() => setColumnFilterDialog("examen")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[4.5rem] text-right text-white font-semibold">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span>Alumnos</span>
                                                        <ColumnFilterHeaderButton
                                                            active={!!tableFilters.alumnos.trim()}
                                                            onClick={() => setColumnFilterDialog("alumnos")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[6rem] text-white font-semibold">
                                                    <div className="flex items-center justify-between gap-1 pr-0.5">
                                                        <span>Estado</span>
                                                        <ColumnFilterHeaderButton
                                                            active={!!tableFilters.estado.trim()}
                                                            onClick={() => setColumnFilterDialog("estado")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[7rem] text-white font-semibold">
                                                    <div className="flex items-center justify-between gap-1 pr-0.5">
                                                        <span>Evento</span>
                                                        <ColumnFilterHeaderButton
                                                            active={tableFilters.vinculo !== "all"}
                                                            onClick={() => setColumnFilterDialog("vinculo")}
                                                        />
                                                    </div>
                                                </TableHead>
                                                <TableHead className="min-w-[5.5rem] text-right text-white font-semibold">
                                                    Acción
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tableRowsSorted.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    className={cn("border-b border-border/60", examRowBg(row.exam_type))}
                                                >
                                                    <TableCell className="w-10 min-w-10 max-w-10 px-2 py-1.5 align-middle text-center">
                                                        <Checkbox
                                                            aria-label={`Seleccionar fila ${row.school_name}`}
                                                            checked={selectedIds.has(row.id)}
                                                            onCheckedChange={() => toggleRowSelected(row.id)}
                                                            disabled={bulkLinking}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5 font-mono text-xs font-medium whitespace-nowrap">
                                                        {row.proposed_date}
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5 text-xs font-medium">
                                                        {row.city ?? "—"}
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5 text-xs">{row.project}</TableCell>
                                                    <TableCell className="align-top py-1.5 text-xs font-semibold uppercase">
                                                        {row.school_name}
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5 text-xs">
                                                        {row.nivel ? (
                                                            <span className="inline-flex rounded-full border border-emerald-600/40 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
                                                                {row.nivel}
                                                            </span>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5">
                                                        <span
                                                            className={cn(
                                                                "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                                                                examPill(row.exam_type)
                                                            )}
                                                        >
                                                            {row.exam_type}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5 text-right text-xs tabular-nums">
                                                        {row.students_planned ?? "—"}
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5">
                                                        <PlanningStatusBadge status={row.planning_status} />
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5">
                                                        {row.event_id ? (
                                                            <EventPlannerLink eventId={row.event_id} />
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="align-top py-1.5 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs"
                                                            onClick={() => linkRow(row)}
                                                            disabled={busyId === row.id || bulkLinking}
                                                        >
                                                            {busyId === row.id ? "…" : "Vincular"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </table>
                                </SyncedHorizontalScroll>
                            </div>
                            {!isLoading && rowsForViews.length === 0 && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No hay filas para los filtros seleccionados.
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="matrix" className="mt-0">
                            <p className="mb-3 text-xs text-muted-foreground">
                                Una fila por colegio (misma ciudad, proyecto, colegio y nivel). Columnas de examen como en el Excel:{" "}
                                <strong>Alumnos</strong> y <strong>Fecha</strong>. Los filtros de la tabla aplican también aquí.
                            </p>
                            {examCols.length === 0 && !isLoading ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No hay tipos de examen en los datos filtrados.
                                </p>
                            ) : (
                                <div className="rounded-xl border border-border/80 overflow-hidden">
                                    <div className="max-h-[min(70vh,48rem)] overflow-auto">
                                        <table className="w-max min-w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-emerald-800 text-white dark:bg-emerald-950">
                                                    <th
                                                        rowSpan={2}
                                                        className="sticky left-0 z-20 border border-emerald-900/40 bg-emerald-800 px-2 py-2 text-left text-xs font-semibold uppercase dark:bg-emerald-950"
                                                    >
                                                        City
                                                    </th>
                                                    <th
                                                        rowSpan={2}
                                                        className="sticky left-[4.5rem] z-20 border border-emerald-900/40 bg-emerald-800 px-2 py-2 text-left text-xs font-semibold dark:bg-emerald-950"
                                                    >
                                                        Proyecto
                                                    </th>
                                                    <th
                                                        rowSpan={2}
                                                        className="sticky left-[10rem] z-20 min-w-[12rem] border border-emerald-900/40 bg-emerald-800 px-2 py-2 text-left text-xs font-semibold dark:bg-emerald-950"
                                                    >
                                                        Colegio
                                                    </th>
                                                    <th
                                                        rowSpan={2}
                                                        className="sticky left-[22rem] z-20 border border-emerald-900/40 bg-emerald-800 px-2 py-2 text-left text-xs font-semibold dark:bg-emerald-950"
                                                    >
                                                        Nivel
                                                    </th>
                                                    {examCols.map((ex) => (
                                                        <th
                                                            key={ex}
                                                            colSpan={2}
                                                            className={cn(
                                                                "border border-white/20 px-1 py-2 text-center text-xs font-bold uppercase tracking-wide",
                                                                examHeaderBg(ex)
                                                            )}
                                                        >
                                                            {ex}
                                                        </th>
                                                    ))}
                                                </tr>
                                                <tr>
                                                    {examCols.flatMap((ex) => [
                                                        <th
                                                            key={`${ex}-n`}
                                                            className={cn(
                                                                "border border-border/40 px-1 py-1 text-center text-[10px] font-semibold",
                                                                examHeaderBg(ex),
                                                                "opacity-95"
                                                            )}
                                                        >
                                                            Alumnos
                                                        </th>,
                                                        <th
                                                            key={`${ex}-d`}
                                                            className={cn(
                                                                "border border-border/40 px-1 py-1 text-center text-[10px] font-semibold",
                                                                examHeaderBg(ex),
                                                                "opacity-95"
                                                            )}
                                                        >
                                                            Fecha
                                                        </th>,
                                                    ])}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pivotRows.map((pr) => (
                                                    <tr key={pr.key} className="border-b border-border/50 bg-background">
                                                        <td className="sticky left-0 z-10 border border-border/50 bg-emerald-50/90 px-2 py-1.5 text-xs font-medium dark:bg-emerald-950/40">
                                                            {pr.city ?? "—"}
                                                        </td>
                                                        <td className="sticky left-[4.5rem] z-10 border border-border/50 bg-emerald-50/90 px-2 py-1.5 text-xs dark:bg-emerald-950/40">
                                                            {pr.project}
                                                        </td>
                                                        <td className="sticky left-[10rem] z-10 min-w-[12rem] border border-border/50 bg-emerald-50/90 px-2 py-1.5 text-xs font-semibold uppercase dark:bg-emerald-950/40">
                                                            {pr.school_name}
                                                        </td>
                                                        <td className="sticky left-[22rem] z-10 border border-border/50 bg-emerald-50/90 px-2 py-1.5 text-xs dark:bg-emerald-950/40">
                                                            {pr.nivel ?? "—"}
                                                        </td>
                                                        {examCols.flatMap((ex) => {
                                                            const list = pr.byExam.get(ex) ?? [];
                                                            return [
                                                                <td
                                                                    key={`${pr.key}-${ex}-n`}
                                                                    className={cn(
                                                                        "border border-border/40 px-1 py-1 align-top text-xs",
                                                                        examRowBg(ex)
                                                                    )}
                                                                >
                                                                    {list.length === 0 ? (
                                                                        <span className="text-muted-foreground/50">—</span>
                                                                    ) : (
                                                                        <div className="flex flex-col gap-1">
                                                                            {list.map((r) => (
                                                                                <div
                                                                                    key={r.id}
                                                                                    className="tabular-nums font-medium"
                                                                                >
                                                                                    {r.students_planned ?? "—"}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>,
                                                                <td
                                                                    key={`${pr.key}-${ex}-d`}
                                                                    className={cn(
                                                                        "border border-border/40 px-1 py-1 align-top text-[11px]",
                                                                        examRowBg(ex)
                                                                    )}
                                                                >
                                                                    {list.length === 0 ? (
                                                                        <span className="text-muted-foreground/50">—</span>
                                                                    ) : (
                                                                        <div className="flex flex-col gap-1.5">
                                                                            {list.map((r) => (
                                                                                <div key={r.id} className="space-y-0.5">
                                                                                    <div className="font-mono text-[10px]">
                                                                                        {r.proposed_date}
                                                                                    </div>
                                                                                    {r.event_id ? (
                                                                                        <EventPlannerLink
                                                                                            eventId={r.event_id}
                                                                                            className="text-[10px]"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-muted-foreground">
                                                                                            Sin vincular
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>,
                                                            ];
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Detalle y vinculación</CardTitle>
                    <CardDescription>
                        Vincula filas a eventos/sesiones existentes o crea automáticamente si falta. Misma selección y
                        vinculación masiva que en la pestaña <strong>Tabla estilo plan</strong> (misma vista filtrada,
                        orden por fecha y colegio).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/25 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{unlinkedInViewCount}</span> sin evento ·{" "}
                            <span className="font-medium text-foreground">{tableRowsSorted.length}</span> en vista ·{" "}
                            <span className="font-medium text-foreground">{selectedIds.size}</span> seleccionados
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={tableRowsSorted.length === 0 || bulkLinking}
                                onClick={selectAllVisibleInTable}
                            >
                                Todas (vista)
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={unlinkedInViewCount === 0 || bulkLinking}
                                onClick={selectUnlinkedVisibleInTable}
                            >
                                Sin evento (vista)
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={selectedIds.size === 0 || bulkLinking}
                                onClick={clearRowSelection}
                            >
                                Quitar selección
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={selectedIds.size === 0 || bulkLinking}
                                onClick={linkSelectedBulk}
                            >
                                {bulkLinking ? (
                                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                    <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                                Vincular seleccionados
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={unlinkedInViewCount === 0 || bulkLinking}
                                onClick={linkAllUnlinkedInView}
                            >
                                {bulkLinking ? (
                                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                ) : (
                                    <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                                Todas sin evento (vista)
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-[min(60vh,36rem)] space-y-2 overflow-y-auto pr-0.5">
                        {tableRowsSorted.map((row) => (
                            <div
                                key={row.id}
                                className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-start md:justify-between"
                            >
                                <div className="flex min-w-0 flex-1 gap-3">
                                    <Checkbox
                                        aria-label={`Seleccionar ${row.school_name}`}
                                        checked={selectedIds.has(row.id)}
                                        onCheckedChange={() => toggleRowSelected(row.id)}
                                        disabled={bulkLinking}
                                        className="mt-1 shrink-0"
                                    />
                                    <div className="min-w-0 space-y-1">
                                        <p className="font-medium">{row.school_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {row.proposed_date} · {row.exam_type.toUpperCase()} ·{" "}
                                            {row.students_planned ?? 0} alumnos · {row.city ?? "N/A"} · Proyecto:{" "}
                                            {row.project}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <PlanningStatusBadge status={row.planning_status} />
                                            {row.event_id ? (
                                                <Badge variant="secondary">Evento vinculado</Badge>
                                            ) : (
                                                <Badge variant="outline">Sin evento</Badge>
                                            )}
                                            {row.event_session_id ? (
                                                <Badge variant="secondary">Sesión vinculada</Badge>
                                            ) : (
                                                <Badge variant="outline">Sin sesión</Badge>
                                            )}
                                            {row.event_id ? <EventPlannerLink eventId={row.event_id} /> : null}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => linkRow(row)}
                                    disabled={busyId === row.id || bulkLinking}
                                    variant={row.event_session_id ? "outline" : "default"}
                                    className="shrink-0"
                                >
                                    {busyId === row.id
                                        ? "Vinculando..."
                                        : row.event_session_id
                                          ? "Re-vincular"
                                          : "Vincular a evento"}
                                </Button>
                            </div>
                        ))}
                    </div>
                    {!isLoading && rowsForViews.length === 0 && (
                        <p className="text-sm text-muted-foreground">No hay filas para los filtros seleccionados.</p>
                    )}
                </CardContent>
            </Card>

            <PlanningColumnFilterDialog
                columnKey={columnFilterDialog}
                onClose={() => setColumnFilterDialog(null)}
                filters={tableFilters}
                setPatch={setTbl}
            />
        </div>
    );
}
