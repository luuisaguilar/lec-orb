"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Clock,
    Eye,
    KanbanSquare,
    LayoutList,
    Loader2,
    Pencil,
    Plus,
    Search,
    ShieldAlert,
    Trash2,
    XCircle,
    FileDown,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SGCKanbanBoard from "./sgc-kanban-board";
import { exportNcToPdf } from "@/lib/sgc/pdf-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DocumentList, DocumentUpload } from "@/components/documents/DocumentPanel";

const fetcher = async (url: string) => {
    const response = await fetch(url);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Error en solicitud SGC");
    return body;
};

const ncFormSchema = z.object({
    title: z.string().max(200).optional(),
    description: z.string().min(1, "La descripcion es obligatoria"),
    stage_id: z.string().optional(),
    severity_id: z.string().optional(),
    analysis: z.string().optional(),
    action_plan_comments: z.string().optional(),
    evaluation_comments: z.string().optional(),
    origin_ids: z.array(z.string()).default([]),
    cause_ids: z.array(z.string()).default([]),
    action_ids: z.array(z.string()).default([]),
});

type NcFormValues = z.infer<typeof ncFormSchema>;

type NcStatus = "draft" | "analysis" | "pending" | "open" | "done" | "cancel";

type Nonconformity = {
    id: string;
    ref: string;
    title: string | null;
    description: string;
    status: NcStatus;
    stage_id: string | null;
    severity_id: string | null;
    analysis: string | null;
    action_plan_comments: string | null;
    evaluation_comments: string | null;
    created_at: string;
    updated_at: string;
    origin_ids?: string[];
    cause_ids?: string[];
    action_links?: Array<{ action_id: string; relation_type: "immediate" | "planned" }>;
};

type AuditEntry = {
    id: string;
    action: string;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
    performed_by: string | null;
    created_at: string;
};

type NcDetail = Nonconformity & { timeline?: AuditEntry[] };

type CatalogOption = { id: string; name: string };
type ActionOption = { id: string; title: string; ref: string; status: string };

const STATUS_ORDER: NcStatus[] = ["draft", "analysis", "pending", "open", "done", "cancel"];
const STATUS_LABEL: Record<NcStatus, string> = {
    draft: "Borrador",
    analysis: "Analisis",
    pending: "Pendiente",
    open: "Abierta",
    done: "Cerrada",
    cancel: "Cancelada",
};
const STATUS_BADGE: Record<NcStatus, string> = {
    draft: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-100",
    analysis: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
    pending: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
    open: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
    done: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
    cancel: "bg-rose-200 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200",
};

// Status transitions allowed
const NEXT_STATUS: Partial<Record<NcStatus, NcStatus>> = {
    draft: "analysis",
    analysis: "open",
    pending: "open",
    open: "done",
};

function toLocalDate(value: string) {
    return new Date(value).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

function toLocalDateTime(value: string) {
    return new Date(value).toLocaleString("es-MX", {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
    });
}

function getStatusChange(entry: AuditEntry): string | null {
    const oldStatus = (entry.old_data as any)?.status as string | undefined;
    const newStatus = (entry.new_data as any)?.status as string | undefined;
    if (oldStatus && newStatus && oldStatus !== newStatus) {
        return `${STATUS_LABEL[oldStatus as NcStatus] ?? oldStatus} → ${STATUS_LABEL[newStatus as NcStatus] ?? newStatus}`;
    }
    return null;
}

// ─── Detail Sheet ────────────────────────────────────────────────────────────

function NcDetailSheet({
    ncId,
    open,
    onClose,
    onEdit,
    stages,
    severities,
    origins,
    causes,
    actions,
    onMutate,
}: {
    ncId: string | null;
    open: boolean;
    onClose: () => void;
    onEdit: (id: string) => void;
    stages: CatalogOption[];
    severities: CatalogOption[];
    origins: CatalogOption[];
    causes: CatalogOption[];
    actions: ActionOption[];
    onMutate: () => Promise<unknown>;
}) {
    const [transitioning, setTransitioning] = useState(false);
    const { hasPermission, isAtLeastSupervisor, isAdmin } = useUser();

    const { data, isLoading, mutate: mutateDetail } = useSWR<{ nonconformity: NcDetail; timeline: AuditEntry[] }>(
        ncId && open ? `/api/v1/sgc/nonconformities/${ncId}` : null,
        fetcher,
    );

    const nc = data?.nonconformity ?? null;
    const timeline = data?.timeline ?? [];

    const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s.name])), [stages]);
    const severityMap = useMemo(() => new Map(severities.map((s) => [s.id, s.name])), [severities]);
    const originMap = useMemo(() => new Map(origins.map((o) => [o.id, o.name])), [origins]);
    const causeMap = useMemo(() => new Map(causes.map((c) => [c.id, c.name])), [causes]);
    const actionMap = useMemo(() => new Map(actions.map((a) => [a.id, a])), [actions]);

    const nextStatus = nc ? NEXT_STATUS[nc.status] : null;

    const transitionStatus = async (targetStatus: NcStatus) => {
        if (!nc) return;
        setTransitioning(true);
        try {
            const res = await fetch(`/api/v1/sgc/nonconformities/${nc.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: targetStatus }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "Error al cambiar estado");
            toast.success(`Estado cambiado a ${STATUS_LABEL[targetStatus]}`);
            await Promise.all([mutateDetail(), onMutate()]);
        } catch (err: any) {
            toast.error(err.message ?? "Error inesperado");
        } finally {
            setTransitioning(false);
        }
    };

    const cancelNc = async () => {
        if (!nc) return;
        setTransitioning(true);
        try {
            const res = await fetch(`/api/v1/sgc/nonconformities/${nc.id}`, { method: "DELETE" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "No se pudo cancelar");
            toast.success("No conformidad cancelada");
            onClose();
            await onMutate();
        } catch (err: any) {
            toast.error(err.message ?? "Error inesperado");
        } finally {
            setTransitioning(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex flex-col gap-0 p-0"
            >
                {isLoading || !nc ? (
                    <div className="flex-1 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Cargando detalle...
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800/60">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0">
                                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{nc.ref}</p>
                                    <SheetTitle className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                                        {nc.title || "Sin titulo"}
                                    </SheetTitle>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge className={cn("text-[10px] border-none", STATUS_BADGE[nc.status])}>
                                            {STATUS_LABEL[nc.status]}
                                        </Badge>
                                        {nc.severity_id && (
                                            <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                                {severityMap.get(nc.severity_id) ?? nc.severity_id}
                                            </Badge>
                                        )}
                                        {nc.stage_id && (
                                            <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                                {stageMap.get(nc.stage_id) ?? nc.stage_id}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800"
                                        onClick={() => {
                                            if (!nc) return;
                                            exportNcToPdf({
                                                ref: nc.ref,
                                                title: nc.title || "Sin título",
                                                status: STATUS_LABEL[nc.status],
                                                description: nc.description,
                                                analysis: nc.analysis,
                                                action_plan: nc.action_plan_comments,
                                                evaluation: nc.evaluation_comments,
                                                severity: nc.severity_id ? severityMap.get(nc.severity_id) : undefined,
                                                stage: nc.stage_id ? stageMap.get(nc.stage_id) : undefined,
                                                created_at: nc.created_at,
                                                updated_at: nc.updated_at,
                                                origins: (nc.origin_ids || []).map(id => originMap.get(id) || id),
                                                causes: (nc.cause_ids || []).map(id => causeMap.get(id) || id),
                                                actions: (nc.action_links || []).map(link => {
                                                    const act = actionMap.get(link.action_id);
                                                    return {
                                                        ref: act?.ref || link.action_id.slice(0, 8),
                                                        title: act?.title || "Acción",
                                                        status: act?.status || "unknown"
                                                    };
                                                })
                                            });
                                        }}
                                    >
                                        <FileDown className="h-3.5 w-3.5 mr-1.5" />
                                        Exportar PDF
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!hasPermission("sgc", "edit") || (nc.status === "done" && !isAdmin)}
                                        className="border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
                                        onClick={() => { onClose(); onEdit(nc.id); }}
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                        Editar
                                    </Button>
                            </div>

                            {/* RBAC Warning for non-supervisors */}
                            {!isAtLeastSupervisor && (
                                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200 uppercase tracking-wider font-semibold">
                                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                    Solo supervisores pueden gestionar transiciones
                                </div>
                            )}

                            {/* Quick transition bar */}
                            {nc.status !== "done" && nc.status !== "cancel" && isAtLeastSupervisor && (
                                <div className="flex gap-2 mt-3 flex-wrap">
                                    {nextStatus && (
                                        <Button
                                            size="sm"
                                            disabled={transitioning}
                                            onClick={() => transitionStatus(nextStatus)}
                                            className="bg-primary/90 hover:bg-primary text-slate-900 dark:text-white"
                                        >
                                            {transitioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ArrowRight className="h-3.5 w-3.5 mr-1.5" />}
                                            Avanzar a {STATUS_LABEL[nextStatus]}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={transitioning}
                                        onClick={cancelNc}
                                        className="border-rose-800 text-rose-400 hover:bg-rose-500/10"
                                    >
                                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                        Cancelar NC
                                    </Button>
                                </div>
                            )}
                        </SheetHeader>

                        <ScrollArea className="flex-1">
                            <div className="px-6 py-5 space-y-6">
                                {/* Description */}
                                <section className="space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Descripcion</p>
                                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{nc.description}</p>
                                </section>

                                {/* Analysis / Plan / Eval */}
                                {(nc.analysis || nc.action_plan_comments || nc.evaluation_comments) && (
                                    <>
                                        <Separator className="bg-slate-100 dark:bg-slate-800/60" />
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            {nc.analysis && (
                                                <section className="space-y-1.5">
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Analisis</p>
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{nc.analysis}</p>
                                                </section>
                                            )}
                                            {nc.action_plan_comments && (
                                                <section className="space-y-1.5">
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Plan de Accion</p>
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{nc.action_plan_comments}</p>
                                                </section>
                                            )}
                                            {nc.evaluation_comments && (
                                                <section className="space-y-1.5">
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Evaluacion de Cierre</p>
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{nc.evaluation_comments}</p>
                                                </section>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Origins + Causes */}
                                {((nc.origin_ids?.length ?? 0) > 0 || (nc.cause_ids?.length ?? 0) > 0) && (
                                    <>
                                        <Separator className="bg-slate-100 dark:bg-slate-800/60" />
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {(nc.origin_ids?.length ?? 0) > 0 && (
                                                <section className="space-y-2">
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Origenes</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {nc.origin_ids!.map((id) => (
                                                            <Badge key={id} variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                                                {originMap.get(id) ?? id}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                            {(nc.cause_ids?.length ?? 0) > 0 && (
                                                <section className="space-y-2">
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Causas</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {nc.cause_ids!.map((id) => (
                                                            <Badge key={id} variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                                                {causeMap.get(id) ?? id}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Linked actions */}
                                {(nc.action_links?.length ?? 0) > 0 && (
                                    <>
                                        <Separator className="bg-slate-100 dark:bg-slate-800/60" />
                                        <section className="space-y-2">
                                            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Acciones CAPA vinculadas</p>
                                            <div className="space-y-2">
                                                {nc.action_links!.map((link) => {
                                                    const action = actionMap.get(link.action_id);
                                                    return (
                                                        <div key={link.action_id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40 px-3 py-2">
                                                            <div className="space-y-0.5 min-w-0">
                                                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{action?.ref ?? link.action_id.slice(0, 8)}</p>
                                                                <p className="text-xs text-slate-800 dark:text-slate-200 truncate">{action?.title ?? "Accion"}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0 ml-3">
                                                                <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 capitalize">
                                                                    {link.relation_type}
                                                                </Badge>
                                                                {action && (
                                                                    <Badge className={cn("text-[10px] border-none",
                                                                        action.status === "done" ? "bg-emerald-900/70 text-emerald-200" :
                                                                        action.status === "cancel" ? "bg-rose-900/70 text-rose-200" :
                                                                        "bg-slate-700 text-slate-800 dark:text-slate-200"
                                                                    )}>
                                                                        {action.status}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    </>
                                )}

                                <Separator className="bg-slate-100 dark:bg-slate-800/60" />
                                <section className="space-y-3">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
                                        Evidencias de la no conformidad
                                    </p>
                                    {hasPermission("sgc", "edit") && (
                                        <DocumentUpload
                                            moduleSlug="sgc-nonconformities"
                                            recordId={nc.id}
                                            onUpload={() => {
                                                void mutateDetail();
                                                void onMutate();
                                            }}
                                        />
                                    )}
                                    <DocumentList
                                        moduleSlug="sgc-nonconformities"
                                        recordId={nc.id}
                                        canDelete={hasPermission("sgc", "delete") || isAdmin}
                                    />
                                </section>

                                {/* Meta */}
                                <Separator className="bg-slate-100 dark:bg-slate-800/60" />
                                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-slate-600">Creado</p>
                                        <p className="mt-0.5">{toLocalDateTime(nc.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-slate-600">Actualizado</p>
                                        <p className="mt-0.5">{toLocalDateTime(nc.updated_at)}</p>
                                    </div>
                                </div>

                                {/* Timeline */}
                                {timeline.length > 0 && (
                                    <>
                                        <Separator className="bg-slate-100 dark:bg-slate-800/60" />
                                        <section className="space-y-3">
                                            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                Historial de cambios
                                            </p>
                                            <div className="relative space-y-0 pl-4 border-l border-slate-200 dark:border-slate-800">
                                                {timeline.map((entry) => {
                                                    const statusChange = getStatusChange(entry);
                                                    const label =
                                                        entry.action === "INSERT" ? "Creado" :
                                                        entry.action === "DELETE" ? "Eliminado" :
                                                        statusChange ? `Estado: ${statusChange}` :
                                                        "Actualizado";
                                                    const icon = entry.action === "INSERT"
                                                        ? <Plus className="h-3 w-3 text-emerald-400" />
                                                        : statusChange?.includes("Cerrada")
                                                        ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                                        : statusChange?.includes("Cancelada")
                                                        ? <XCircle className="h-3 w-3 text-rose-400" />
                                                        : <Pencil className="h-3 w-3 text-slate-600 dark:text-slate-400" />;
                                                    return (
                                                        <div key={entry.id} className="relative pb-4 last:pb-0">
                                                            <span className="absolute -left-[17px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-slate-900 ring-1 ring-slate-800">
                                                                {icon}
                                                            </span>
                                                            <div className="ml-2">
                                                                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{label}</p>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{toLocalDateTime(entry.created_at)}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SGCNonconformities() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [view, setView] = useState<"table" | "kanban">("table");

    // Detail sheet
    const [detailId, setDetailId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const { hasPermission, isAdmin, isLoading: userLoading } = useUser();

    // Edit dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const query = useMemo(() => {
        const params = new URLSearchParams({ page: "1", limit: "200" });
        if (search.trim()) params.set("q", search.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        return `/api/v1/sgc/nonconformities?${params.toString()}`;
    }, [search, statusFilter]);

    const { data, isLoading, mutate } = useSWR(query, fetcher);
    const { data: stagesData } = useSWR("/api/v1/sgc/catalogs/stages?kind=nc", fetcher);
    const { data: severitiesData } = useSWR("/api/v1/sgc/catalogs/severities", fetcher);
    const { data: originsData } = useSWR("/api/v1/sgc/catalogs/origins?include_inactive=true", fetcher);
    const { data: causesData } = useSWR("/api/v1/sgc/catalogs/causes?include_inactive=true", fetcher);
    const { data: actionsData } = useSWR("/api/v1/sgc/actions?page=1&limit=300", fetcher);

    const items: Nonconformity[] = useMemo(() => data?.nonconformities ?? [], [data?.nonconformities]);
    const stages: CatalogOption[] = useMemo(() => stagesData?.stages ?? [], [stagesData?.stages]);
    const severities: CatalogOption[] = useMemo(() => severitiesData?.severities ?? [], [severitiesData?.severities]);
    const origins: CatalogOption[] = useMemo(() => originsData?.origins ?? [], [originsData?.origins]);
    const causes: CatalogOption[] = useMemo(() => causesData?.causes ?? [], [causesData?.causes]);
    const actions: ActionOption[] = useMemo(() => actionsData?.actions ?? [], [actionsData?.actions]);

    const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s.name])), [stages]);
    const severityMap = useMemo(() => new Map(severities.map((s) => [s.id, s.name])), [severities]);

    const counters = useMemo(() => {
        const base = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => { acc[s] = 0; return acc; }, {});
        for (const item of items) base[item.status] = (base[item.status] ?? 0) + 1;
        return base;
    }, [items]);

    const form = useForm<NcFormValues>({
        resolver: zodResolver(ncFormSchema) as any,
        defaultValues: {
            title: "", description: "", stage_id: "", severity_id: "",
            analysis: "", action_plan_comments: "", evaluation_comments: "",
            origin_ids: [], cause_ids: [], action_ids: [],
        },
    });

    const selectedOriginIds = form.watch("origin_ids");
    const selectedCauseIds = form.watch("cause_ids");
    const selectedActionIds = form.watch("action_ids");

    useEffect(() => {
        if (!dialogOpen) {
            setEditingId(null);
            setLoadingDetails(false);
        }
    }, [dialogOpen]);

    // Prevent UI flicker by waiting for user permissions to load
    // This MUST be after all hooks to follow the Rules of Hooks
    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Validando permisos...
            </div>
        );
    }

    const openCreate = () => {
        setEditingId(null);
        form.reset({
            title: "", description: "", stage_id: "", severity_id: "",
            analysis: "", action_plan_comments: "", evaluation_comments: "",
            origin_ids: [], cause_ids: [], action_ids: [],
        });
        setDialogOpen(true);
    };

    const openEdit = async (id: string) => {
        setEditingId(id);
        setDialogOpen(true);
        setLoadingDetails(true);
        try {
            const detail = await fetcher(`/api/v1/sgc/nonconformities/${id}`);
            const nc: Nonconformity = detail.nonconformity;
            form.reset({
                title: nc.title ?? "",
                description: nc.description ?? "",
                stage_id: nc.stage_id ?? "",
                severity_id: nc.severity_id ?? "",
                analysis: nc.analysis ?? "",
                action_plan_comments: nc.action_plan_comments ?? "",
                evaluation_comments: nc.evaluation_comments ?? "",
                origin_ids: nc.origin_ids ?? [],
                cause_ids: nc.cause_ids ?? [],
                action_ids: (nc.action_links ?? []).map((item) => item.action_id),
            });
        } catch (error: any) {
            toast.error(error.message ?? "No se pudo cargar la no conformidad");
            setDialogOpen(false);
            setEditingId(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const openDetail = (id: string) => {
        setDetailId(id);
        setDetailOpen(true);
    };

    const toggleSelection = (field: "origin_ids" | "cause_ids" | "action_ids", value: string) => {
        const current = form.getValues(field) ?? [];
        if (current.includes(value)) {
            form.setValue(field, current.filter((item) => item !== value));
            return;
        }
        form.setValue(field, [...current, value]);
    };

    const submit = form.handleSubmit(async (values) => {
        setSaving(true);
        try {
            const payload = {
                title: values.title?.trim() || null,
                description: values.description.trim(),
                stage_id: values.stage_id || null,
                severity_id: values.severity_id || null,
                analysis: values.analysis?.trim() || null,
                action_plan_comments: values.action_plan_comments?.trim() || null,
                evaluation_comments: values.evaluation_comments?.trim() || null,
                origin_ids: values.origin_ids,
                cause_ids: values.cause_ids,
                action_links: values.action_ids.map((actionId) => ({
                    action_id: actionId,
                    relation_type: "planned" as const,
                })),
            };

            const url = editingId ? `/api/v1/sgc/nonconformities/${editingId}` : "/api/v1/sgc/nonconformities";
            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la no conformidad");

            toast.success(editingId ? "No conformidad actualizada" : "No conformidad creada");
            setDialogOpen(false);
            setEditingId(null);
            form.reset();
            await mutate();
        } catch (error: any) {
            toast.error(error.message ?? "Error inesperado");
        } finally {
            setSaving(false);
        }
    });

    const cancelNonconformity = async (id: string) => {
        setDeletingId(id);
        try {
            const response = await fetch(`/api/v1/sgc/nonconformities/${id}`, { method: "DELETE" });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error ?? "No se pudo cancelar la no conformidad");
            toast.success("No conformidad cancelada");
            await mutate();
        } catch (error: any) {
            toast.error(error.message ?? "Error cancelando no conformidad");
        } finally {
            setDeletingId(null);
        }
    };

    const handleMoveNC = async (id: string, newStatus: NcStatus) => {
        try {
            const res = await fetch(`/api/v1/sgc/nonconformities/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "No se pudo cambiar el estado");
            toast.success(`Estado actualizado a ${STATUS_LABEL[newStatus]}`);
            await mutate();
        } catch (err: any) {
            toast.error(err.message || "Error al mover no conformidad");
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Conformidades</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Gestion diaria de hallazgos, analisis y cierre CAPA.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={view === "table" ? "default" : "outline"}
                        size="sm"
                        className="border-slate-300 dark:border-slate-700"
                        onClick={() => setView("table")}
                    >
                        <LayoutList className="h-4 w-4 mr-2" />
                        Tabla
                    </Button>
                    <Button
                        variant={view === "kanban" ? "default" : "outline"}
                        size="sm"
                        className="border-slate-300 dark:border-slate-700"
                        onClick={() => setView("kanban")}
                    >
                        <KanbanSquare className="h-4 w-4 mr-2" />
                        Kanban
                    </Button>
                    {hasPermission("sgc", "edit") && (
                        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva NC
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI counters */}
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {STATUS_ORDER.map((status) => (
                    <Card
                        key={status}
                        className={cn(
                            "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 cursor-pointer transition-colors hover:border-slate-300 dark:border-slate-700",
                            statusFilter === status && "ring-1 ring-primary/60",
                        )}
                        onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                    >
                        <CardContent className="p-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">{STATUS_LABEL[status]}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{counters[status] ?? 0}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search bar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-9 bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700"
                        placeholder="Buscar por ref, titulo o descripcion..."
                    />
                </div>
                {statusFilter !== "all" && (
                    <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white" onClick={() => setStatusFilter("all")}>
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Limpiar filtro
                    </Button>
                )}
            </div>

            {/* Table / Kanban */}
            {isLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Cargando no conformidades...
                </div>
            ) : view === "table" ? (
                <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800/60">
                        <CardTitle className="text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-primary" />
                            Registro de No Conformidades
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/60">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Ref</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Titulo</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Etapa</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Severidad</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Estatus</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Actualizado</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                                                Sin no conformidades para los filtros actuales.
                                            </td>
                                        </tr>
                                    )}
                                    {items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                                            onClick={() => openDetail(item.id)}
                                        >
                                            <td className="px-3 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">{item.ref}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title || "Sin titulo"}</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{item.description}</p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 text-xs">{stageMap.get(item.stage_id || "") ?? "—"}</td>
                                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 text-xs">{severityMap.get(item.severity_id || "") ?? "—"}</td>
                                            <td className="px-3 py-2.5">
                                                <Badge className={cn("text-[10px] border-none", STATUS_BADGE[item.status])}>
                                                    {STATUS_LABEL[item.status]}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400">{toLocalDate(item.updated_at)}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                                                        onClick={() => openDetail(item.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 disabled:opacity-20"
                                                        disabled={!hasPermission("sgc", "edit") || (item.status === "done" && !isAdmin)}
                                                        onClick={() => openEdit(item.id)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-20"
                                                        disabled={deletingId === item.id || !hasPermission("sgc", "delete") || (item.status === "done" && !isAdmin)}
                                                        onClick={() => cancelNonconformity(item.id)}
                                                    >
                                                        {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <SGCKanbanBoard
                    items={items}
                    statuses={STATUS_ORDER}
                    statusLabels={STATUS_LABEL}
                    statusBadges={STATUS_BADGE}
                    onMove={handleMoveNC}
                    onDetail={openDetail}
                    severityMap={severityMap}
                />
            )}

            {/* Detail Sheet */}
            <NcDetailSheet
                ncId={detailId}
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                onEdit={openEdit}
                stages={stages}
                severities={severities}
                origins={origins}
                causes={causes}
                actions={actions}
                onMutate={mutate}
            />

            {/* Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-5xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Editar No Conformidad" : "Nueva No Conformidad"}</DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                            Define el hallazgo, su analisis y los vinculos CAPA para seguimiento.
                        </DialogDescription>
                    </DialogHeader>

                    {loadingDetails ? (
                        <div className="h-40 flex items-center justify-center text-slate-600 dark:text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Cargando detalle...
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Titulo</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value ?? ""} className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Descripcion</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} value={field.value ?? ""} className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 min-h-[88px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <FormField
                                        control={form.control}
                                        name="stage_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Etapa</FormLabel>
                                                <Select value={field.value || "__none__"} onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700">
                                                            <SelectValue placeholder="Selecciona etapa" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">Sin etapa</SelectItem>
                                                        {stages.map((stage) => (
                                                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="severity_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Severidad</FormLabel>
                                                <Select value={field.value || "__none__"} onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700">
                                                            <SelectValue placeholder="Selecciona severidad" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">Sin severidad</SelectItem>
                                                        {severities.map((severity) => (
                                                            <SelectItem key={severity.id} value={severity.id}>{severity.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <FormField
                                        control={form.control}
                                        name="analysis"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Analisis</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} value={field.value ?? ""} className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 min-h-[100px]" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="action_plan_comments"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Plan de Accion</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} value={field.value ?? ""} className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 min-h-[100px]" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="evaluation_comments"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Evaluacion de cierre</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} value={field.value ?? ""} className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 min-h-[100px]" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid gap-4 lg:grid-cols-3">
                                    <Card className="bg-white dark:bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">Origenes</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <ScrollArea className="h-40 pr-2">
                                                <div className="space-y-2">
                                                    {origins.map((origin) => (
                                                        <label key={origin.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedOriginIds.includes(origin.id)}
                                                                onChange={() => toggleSelection("origin_ids", origin.id)}
                                                                className="h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-900"
                                                            />
                                                            <span>{origin.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white dark:bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">Causas</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <ScrollArea className="h-40 pr-2">
                                                <div className="space-y-2">
                                                    {causes.map((cause) => (
                                                        <label key={cause.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCauseIds.includes(cause.id)}
                                                                onChange={() => toggleSelection("cause_ids", cause.id)}
                                                                className="h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-900"
                                                            />
                                                            <span>{cause.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-white dark:bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">Acciones vinculadas</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <ScrollArea className="h-40 pr-2">
                                                <div className="space-y-2">
                                                    {actions.map((action) => (
                                                        <label key={action.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedActionIds.includes(action.id)}
                                                                onChange={() => toggleSelection("action_ids", action.id)}
                                                                className="h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-900"
                                                            />
                                                            <span className="truncate">
                                                                {action.ref} · {action.title}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {editingId ? "Actualizar NC" : "Crear NC"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>

            <Card className="bg-white dark:bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 text-xs text-slate-600 dark:text-slate-400 flex gap-2 items-start">
                    <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-400" />
                    <span>
                        El cierre de NC depende de reglas de DB: requiere evaluacion final y acciones vinculadas en estado done.
                    </span>
                </CardContent>
            </Card>
        </div>
    );
}

