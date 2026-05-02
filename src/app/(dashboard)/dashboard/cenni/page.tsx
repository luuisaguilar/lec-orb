"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Plus, Search, Download, Loader2, Check, X,
    MoreHorizontal, Trash2, FileSpreadsheet, Pencil,
    LayoutList, KanbanSquare, FileCheck, Eye, Mail, ChevronLeft, ChevronRight, Upload
} from "lucide-react";
import {
    DndContext, DragOverlay, closestCorners, KeyboardSensor,
    PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent,
    useDraggable, useDroppable
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { CenniImportDialog } from "@/components/cenni/cenni-import-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Status definitions ────────────────────────────────────────────────────────
const STATUSES = [
    "EN OFICINA",
    "SOLICITADO",
    "EN TRAMITE/REVISION",
    "APROBADO",
    "RECHAZADO",
] as const;

const CERT_STATUSES = [
    "EN PROCESO DE DICTAMINACION",
    "APROBADO",
    "RECHAZADO",
] as const;

const statusColors: Record<string, string> = {
    "EN OFICINA":          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    "SOLICITADO":          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "EN TRAMITE/REVISION": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "APROBADO":            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "RECHAZADO":           "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const certColors: Record<string, string> = {
    "APROBADO": "bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    "RECHAZADO": "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    "EN PROCESO DE DICTAMINACION": "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
};

const kanbanColors: Record<string, string> = {
    "EN OFICINA":          "border-gray-400 bg-gray-50 dark:bg-gray-950/20",
    "SOLICITADO":          "border-blue-400 bg-blue-50 dark:bg-blue-950/20",
    "EN TRAMITE/REVISION": "border-amber-400 bg-amber-50 dark:bg-amber-950/20",
    "APROBADO":            "border-green-400 bg-green-50 dark:bg-green-950/20",
    "RECHAZADO":           "border-red-400 bg-red-50 dark:bg-red-950/20",
};

interface CenniCase {
    id: string;
    folio_cenni: string;
    cliente_estudiante: string;
    celular: string | null;
    correo: string | null;
    solicitud_cenni: boolean;
    acta_o_curp: boolean;
    id_documento: boolean;
    certificado: string | null;
    datos_curp: string | null;
    cliente: string | null;
    estatus: string;
    estatus_certificado: string | null;
    fecha_recepcion: string | null;
    fecha_revision: string | null;
    motivo_rechazo: string | null;
    notes: string | null;
    created_at: string;
    certificate_storage_path: string | null;
    certificate_uploaded_at: string | null;
    certificate_sent_at: string | null;
    certificate_sent_to: string | null;
}

interface DashboardStatsResponse {
    cenni?: {
        byStatus?: Record<string, number>;
        total?: number;
    };
}

// ── DocDisplay — read-only indicator ────────────────────────────────────────
const DocDisplay = ({ checked }: { checked: boolean }) => (
    <span className={`w-6 h-6 rounded flex items-center justify-center mx-auto ${checked
        ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
        }`}>
        {checked ? <Check className="h-4 w-4" /> : <X className="h-3.5 w-3.5" />}
    </span>
);

const TABLE_PAGE_SIZE = 50;

const displayFolio = (folio: string) =>
    folio.startsWith("CENNI-") ? folio.slice(6) : folio;

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CENNIPage() {
    const { t } = useI18n();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editCase, setEditCase] = useState<CenniCase | null>(null);
    const [view, setView] = useState<"table" | "kanban" | "certs">("table");

    const [page, setPage] = useState(0);
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(0); }, [debouncedSearch, statusFilter]);

    const swrUrl = useMemo(() => {
        const params = new URLSearchParams({ limit: "300" });
        if (debouncedSearch) params.set("q", debouncedSearch);
        return `/api/v1/cenni?${params.toString()}`;
    }, [debouncedSearch]);

    const { data, isLoading, mutate } = useSWR(swrUrl, fetcher);
    const { data: dashboardStats } = useSWR<DashboardStatsResponse>("/api/v1/dashboard/stats", fetcher);
    const allCases = useMemo<CenniCase[]>(() => data?.cases || [], [data?.cases]);
    const userRole = data?.role || "operador";

    const fallbackStatusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const status of STATUSES) counts[status] = 0;
        for (const c of allCases) {
            counts[c.estatus] = (counts[c.estatus] || 0) + 1;
        }
        return counts;
    }, [allCases]);

    const useGlobalStats = debouncedSearch.length === 0;

    const statusCounts = useMemo(() => {
        const fromStats = dashboardStats?.cenni?.byStatus || {};
        const result: Record<string, number> = {};
        for (const status of STATUSES) {
            result[status] = useGlobalStats
                ? (fromStats[status] ?? fallbackStatusCounts[status] ?? 0)
                : (fallbackStatusCounts[status] ?? 0);
        }
        return result;
    }, [dashboardStats?.cenni?.byStatus, fallbackStatusCounts, useGlobalStats]);

    const totalCasesForStats = useMemo(() => {
        if (!useGlobalStats) return allCases.length;
        return dashboardStats?.cenni?.total ?? allCases.length;
    }, [useGlobalStats, dashboardStats?.cenni?.total, allCases.length]);

    const maxStatusCount = useMemo(
        () => Math.max(1, ...STATUSES.map((status) => statusCounts[status] || 0)),
        [statusCounts]
    );

    const filteredCases = allCases.filter(
        (c) => statusFilter === "all" || c.estatus === statusFilter,
    );

    const pageCount = Math.max(1, Math.ceil(filteredCases.length / TABLE_PAGE_SIZE));
    const pagedCases = filteredCases.slice(page * TABLE_PAGE_SIZE, (page + 1) * TABLE_PAGE_SIZE);

    const handlePatch = useCallback(async (id: string, patch: Record<string, unknown>) => {
        try {
            const res = await fetch(`/api/v1/cenni/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            if (res.ok) { mutate(); } else { toast.error("Error guardando"); }
        } catch { toast.error("Error"); }
    }, [mutate]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("¿Eliminar este registro de CENNI? Esta acción no se puede deshacer.")) return;
        try {
            const res = await fetch(`/api/v1/cenni/${id}`, { method: "DELETE" });
            if (res.ok) { toast.success("Registro eliminado"); mutate(); }
            else toast.error("Error eliminando registro");
        } catch { toast.error("Error"); }
    }, [mutate]);

    const handleExportExcel = useCallback(async () => {
        try {
            const xlsx = await import("xlsx");
            const rows = filteredCases.map((c) => ({
                "FECHA REGISTRO": new Date(c.created_at).toLocaleDateString("es-MX"),
                "FOLIO": c.folio_cenni,
                "CLIENTE/ESTUDIANTE": c.cliente_estudiante,
                "CELULAR": c.celular || "",
                "CORREO": c.correo || "",
                "SOLICITUD CENNI": c.solicitud_cenni ? "✅" : "",
                "ACTA O CURP": c.acta_o_curp ? "✅" : "",
                "ID": c.id_documento ? "✅" : "",
                "CERTIFICADO": c.certificado || "",
                "DATOS CURP": c.datos_curp || "",
                "CLIENTE": c.cliente || "",
                "ESTATUS": c.estatus,
                "FECHA RECEPCION": c.fecha_recepcion || "",
                "FECHA REVISION": c.fecha_revision || "",
                "ESTATUS CERTIFICADO": c.estatus_certificado || "",
                "MOTIVO RECHAZO": c.motivo_rechazo || "",
                "NOTAS": c.notes || "",
            }));
            const ws = xlsx.utils.json_to_sheet(rows);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "CENNI");
            xlsx.writeFile(wb, `CENNI_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success("Excel exportado");
        } catch { toast.error("Error al exportar"); }
    }, [filteredCases]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <h2 className="text-2xl font-bold tracking-tight">{t("cenni.title")}</h2>
                <div className="flex gap-2 flex-wrap">
                    {/* View toggle */}
                    <div className="flex rounded-md border overflow-hidden">
                        <Button size="sm" variant={view === "table" ? "default" : "ghost"} className="rounded-none px-3" onClick={() => setView("table")}>
                            <LayoutList className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant={view === "kanban" ? "default" : "ghost"} className="rounded-none px-3" onClick={() => setView("kanban")}>
                            <KanbanSquare className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant={view === "certs" ? "default" : "ghost"} className="rounded-none px-3" onClick={() => setView("certs")} title="Certificados emitidos">
                            <FileCheck className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" onClick={() => setShowImport(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel}>
                        <Download className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                    <Button onClick={() => setShowCreate(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Registro
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Resumen por estatus</h3>
                            <Badge variant="outline" className="font-mono">Total: {totalCasesForStats}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                            {STATUSES.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                                    className={cn(
                                        "rounded-xl border p-3 text-left transition-all hover:shadow-sm",
                                        statusFilter === status
                                            ? "border-primary bg-primary/10"
                                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40"
                                    )}
                                >
                                    <p className={cn("text-[10px] uppercase tracking-widest font-semibold mb-1", statusColors[status])}>{status}</p>
                                    <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Distribucion</h3>
                        <div className="space-y-2">
                            {STATUSES.map((status) => {
                                const value = statusCounts[status] || 0;
                                const width = `${Math.round((value / maxStatusCount) * 100)}%`;
                                return (
                                    <div key={status} className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-slate-500">{status}</span>
                                            <span className="font-semibold">{value}</span>
                                        </div>
                                        <div className="h-2 rounded bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                            <div className={cn("h-full rounded", statusColors[status])} style={{ width }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar folio, nombre, correo..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>
                        Todos ({totalCasesForStats})
                    </Button>
                    {STATUSES.map((s) => (
                        <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
                            {s} ({statusCounts[s] || 0})
                        </Button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : view === "kanban" ? (
                <KanbanView
                    cases={filteredCases}
                    userRole={userRole}
                    onEdit={setEditCase}
                    onDelete={handleDelete}
                    onStatusChange={(id, s) => handlePatch(id, { estatus: s })}
                />
            ) : view === "certs" ? (
                <CertificadosView cases={allCases.filter(c => c.certificate_storage_path)} search={search} onUpdate={mutate} />
            ) : (
                <TableView
                    cases={pagedCases}
                    total={filteredCases.length}
                    page={page}
                    pageCount={pageCount}
                    onPageChange={setPage}
                    userRole={userRole}
                    onEdit={setEditCase}
                    onDelete={handleDelete}
                    onStatusChange={(id, s) => handlePatch(id, { estatus: s })}
                    onCertStatusChange={(id, s) => handlePatch(id, { estatus_certificado: s || null })}
                    onCertUploaded={mutate}
                />
            )}

            {/* Dialogs */}
            <CreateCenniDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                onSuccess={() => { mutate(); setShowCreate(false); }}
            />
            <EditCenniDialog
                case_={editCase}
                onClose={() => setEditCase(null)}
                onSuccess={() => { mutate(); setEditCase(null); }}
            />
            <CenniImportDialog
                open={showImport}
                onOpenChange={setShowImport}
                onSuccess={() => { mutate(); setShowImport(false); }}
            />
        </div>
    );
}

// ── Table View ────────────────────────────────────────────────────────────────
function TableView({ cases, total, page, pageCount, onPageChange, userRole, onEdit, onDelete, onStatusChange, onCertStatusChange, onCertUploaded }: {
    cases: CenniCase[];
    total: number;
    page: number;
    pageCount: number;
    onPageChange: (p: number) => void;
    userRole: string;
    onEdit: (c: CenniCase) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, s: string) => void;
    onCertStatusChange: (id: string, s: string) => void;
    onCertUploaded: () => void;
}) {
    const canDelete = userRole === "admin" || userRole === "supervisor" || userRole === "coordinador";
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const handleCertUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingId) return;
        e.target.value = "";
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/v1/cenni/${uploadingId}/certificate-upload`, { method: "POST", body: form });
        if (res.ok) {
            toast.success("Certificado subido correctamente");
            onCertUploaded();
        } else {
            const body = await res.json().catch(() => ({}));
            toast.error(body.error || "Error al subir el certificado");
        }
        setUploadingId(null);
    }, [uploadingId, onCertUploaded]);
    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Registro</th>
                                <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Folio</th>
                                <th className="px-3 py-2.5 text-left font-medium">Cliente / Estudiante</th>
                                <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">CURP</th>
                                <th className="px-3 py-2.5 text-left font-medium">Correo</th>
                                <th className="px-3 py-2.5 text-left font-medium">Celular</th>
                                <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap" title="Solicitud CENNI">Sol.</th>
                                <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap" title="Acta o CURP">Acta</th>
                                <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap" title="Identificación">ID</th>
                                <th className="px-3 py-2.5 text-left font-medium">Certificado</th>
                                <th className="px-3 py-2.5 text-center font-medium">Estatus</th>
                                <th className="px-3 py-2.5 text-center font-medium">Est. Certificado</th>
                                <th className="px-3 py-2.5 text-center font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map((c) => (
                                <tr key={c.id} className="border-b transition-colors hover:bg-muted/40">
                                    {/* Fecha */}
                                    <td className="px-3 py-2 text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                                        {new Date(c.created_at).toLocaleDateString("es-MX")}
                                    </td>
                                    {/* Folio */}
                                    <td className="px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap" title={c.folio_cenni}>
                                        {displayFolio(c.folio_cenni)}
                                    </td>
                                    {/* Cliente / Estudiante */}
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-xs">{c.cliente_estudiante}</div>
                                        {c.cliente && (
                                            <div className="text-[10px] text-muted-foreground mt-0.5">{c.cliente}</div>
                                        )}
                                    </td>
                                    {/* CURP */}
                                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                        {c.datos_curp || "—"}
                                    </td>
                                    {/* Correo — full, no truncate */}
                                    <td className="px-3 py-2 text-xs text-muted-foreground min-w-[180px]">
                                        {c.correo || "—"}
                                    </td>
                                    {/* Celular */}
                                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                                        {c.celular || "—"}
                                    </td>
                                    {/* Doc indicators — read-only, edit via dialog */}
                                    <td className="px-3 py-2 text-center">
                                        <DocDisplay checked={c.solicitud_cenni} />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <DocDisplay checked={c.acta_o_curp} />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <DocDisplay checked={c.id_documento} />
                                    </td>
                                    {/* Certificado — plain text, not editable inline */}
                                    <td className="px-3 py-2 text-xs text-muted-foreground">
                                        {c.certificado || "—"}
                                    </td>
                                    {/* Estatus */}
                                    <td className="px-3 py-2 text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="focus:outline-none">
                                                <Badge className={`cursor-pointer ${statusColors[c.estatus] || "bg-gray-100 text-gray-700"}`}>
                                                    {c.estatus}
                                                </Badge>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center">
                                                <DropdownMenuLabel>Cambiar Estatus</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {STATUSES.map((s) => (
                                                    <DropdownMenuItem key={s} onClick={() => onStatusChange(c.id, s)} className={c.estatus === s ? "font-bold" : ""}>
                                                        {s}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                    {/* Est. Certificado */}
                                    <td className="px-3 py-2 text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="focus:outline-none">
                                                <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer ${c.estatus_certificado ? certColors[c.estatus_certificado] || "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                                                    {c.estatus_certificado || "Asignar"}
                                                </span>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center">
                                                <DropdownMenuLabel>Certificado</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {CERT_STATUSES.map((s) => (
                                                    <DropdownMenuItem key={s} onClick={() => onCertStatusChange(c.id, s)} className={c.estatus_certificado === s ? "font-bold" : ""}>
                                                        {s}
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => onCertStatusChange(c.id, "")} className="text-muted-foreground">
                                                    Limpiar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                    {/* Acciones */}
                                    <td className="px-3 py-2 text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => onEdit(c)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar registro
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setUploadingId(c.id); fileInputRef.current?.click(); }}>
                                                    <Upload className="mr-2 h-4 w-4" /> Subir certificado
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {canDelete && (
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-700 dark:text-red-500" onClick={() => onDelete(c.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleCertUpload}
                />
                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        {total === 0
                            ? "Sin registros"
                            : `${page * TABLE_PAGE_SIZE + 1}–${Math.min((page + 1) * TABLE_PAGE_SIZE, total)} de ${total} registros`}
                    </span>
                    {pageCount > 1 && (
                        <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="px-1">{page + 1} / {pageCount}</span>
                            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={page >= pageCount - 1} onClick={() => onPageChange(page + 1)}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ── Kanban View Components ──────────────────────────────────────────────────────

function DraggableKanbanCard({ c, userRole, onEdit, onDelete }: { c: CenniCase; userRole: string; onEdit: (c: CenniCase) => void; onDelete: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: c.id,
        data: { status: c.estatus, case: c }
    });
    const style = transform ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : "auto", position: isDragging ? "relative" as const : "static" as const } : undefined;
    const canDelete = userRole === "admin" || userRole === "supervisor" || userRole === "coordinador";

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="bg-background rounded-lg border shadow-sm p-3 space-y-2 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-semibold text-xs leading-tight">{c.cliente_estudiante}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{c.folio_cenni}</p>
                </div>
                <div className="flex gap-1 shrink-0 bg-background/80 rounded" onPointerDown={(e) => e.stopPropagation() /* prevent drag when clicking buttons */}>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(c); }} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="p-1 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
            {/* Contact */}
            {(c.correo || c.celular) && (
                <div className="text-[10px] text-muted-foreground space-y-0.5 break-all">
                    {c.correo && <p>{c.correo}</p>}
                    {c.celular && <p>{c.celular}</p>}
                </div>
            )}
            {/* Docs */}
            <div className="flex gap-2 items-center">
                <span className="text-[9px] text-muted-foreground">Docs:</span>
                <DocDisplay checked={c.solicitud_cenni} />
                <DocDisplay checked={c.acta_o_curp} />
                <DocDisplay checked={c.id_documento} />
            </div>
        </div>
    );
}

function DroppableKanbanColumn({ status, cases, userRole, onEdit, onDelete }: { status: string; cases: CenniCase[]; userRole: string; onEdit: (c: CenniCase) => void; onDelete: (id: string) => void }) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div className="flex-shrink-0 w-72 flex flex-col">
            <div className={`rounded-xl border-t-4 border bg-card flex-1 ${kanbanColors[status]} ${isOver ? "ring-2 ring-primary ring-inset opacity-80" : ""}`}>
                <div className="px-3 py-2.5 flex items-center justify-between border-b bg-card/50">
                    <span className="text-xs font-bold uppercase tracking-wide">{status}</span>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${statusColors[status]}`}>{cases.length}</span>
                </div>
                <div ref={setNodeRef} className="p-2 space-y-2 min-h-[150px] flex-1">
                    {cases.map((c) => (
                        <DraggableKanbanCard key={c.id} c={c} userRole={userRole} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function KanbanView({ cases, userRole, onEdit, onDelete, onStatusChange }: {
    cases: CenniCase[];
    userRole: string;
    onEdit: (c: CenniCase) => void;
    onDelete: (id: string) => void;
    onStatusChange: (id: string, s: string) => void;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const [activeCase, setActiveCase] = useState<CenniCase | null>(null);

    const handleDragStart = (e: DragStartEvent) => {
        setActiveCase(e.active.data.current?.case as CenniCase);
    };

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveCase(null);
        const { active, over } = e;
        if (!over) return;

        const caseId = active.id as string;
        const newStatus = over.id as string;
        const currentStatus = active.data.current?.status;

        if (currentStatus !== newStatus) {
            onStatusChange(caseId, newStatus);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 items-stretch">
                {STATUSES.map((status) => (
                    <DroppableKanbanColumn
                        key={status}
                        status={status}
                        cases={cases.filter(c => c.estatus === status)}
                        userRole={userRole}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
            <DragOverlay dropAnimation={null}>
                {activeCase ? (
                    <div className="opacity-80 rotate-2 scale-105 shadow-xl">
                        <DraggableKanbanCard c={activeCase} userRole={userRole} onEdit={() => { }} onDelete={() => { }} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────
function EditCenniDialog({ case_, onClose, onSuccess }: {
    case_: CenniCase | null;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { t } = useI18n();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [solicitud, setSolicitud] = useState(case_?.solicitud_cenni ?? false);
    const [acta, setActa] = useState(case_?.acta_o_curp ?? false);
    const [idDoc, setIdDoc] = useState(case_?.id_documento ?? false);

    // Reset checkboxes when a different case opens
    const caseId = case_?.id;
    if (case_ && (case_.solicitud_cenni !== solicitud || case_.acta_o_curp !== acta || case_.id_documento !== idDoc)) {
        if (caseId !== undefined) { /* triggered by parent re-render, safe to ignore stale */ }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!case_) return;
        setIsSubmitting(true);
        const fd = new FormData(e.currentTarget);
        const patch: Record<string, unknown> = {
            folio_cenni: fd.get("folio_cenni"),
            cliente_estudiante: fd.get("cliente_estudiante"),
            celular: fd.get("celular") || null,
            correo: fd.get("correo") || null,
            certificado: fd.get("certificado") || null,
            datos_curp: fd.get("datos_curp") || null,
            cliente: fd.get("cliente") || null,
            notes: fd.get("notes") || null,
            estatus: fd.get("estatus"),
            estatus_certificado: (() => { const v = fd.get("estatus_certificado") as string; return (!v || v === "__none__") ? null : v; })(),
            fecha_recepcion: (fd.get("fecha_recepcion") as string) || null,
            fecha_revision: (fd.get("fecha_revision") as string) || null,
            motivo_rechazo: fd.get("motivo_rechazo") || null,
            solicitud_cenni: solicitud,
            acta_o_curp: acta,
            id_documento: idDoc,
        };
        const dateVal = fd.get("created_at") as string;
        if (dateVal) patch.created_at = new Date(dateVal).toISOString();

        try {
            const res = await fetch(`/api/v1/cenni/${case_.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            if (res.ok) { toast.success("Registro actualizado"); onSuccess(); }
            else toast.error("Error al guardar");
        } catch { toast.error("Error"); }
        finally { setIsSubmitting(false); }
    };

    if (!case_) return null;

    // format created_at for date input
    const dateValue = case_.created_at
        ? new Date(case_.created_at).toISOString().slice(0, 10)
        : "";

    return (
        <Dialog open={!!case_} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Registro — <span className="font-mono">{case_.folio_cenni}</span></DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="e_folio">Folio</Label>
                            <Input id="e_folio" name="folio_cenni" defaultValue={case_.folio_cenni} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="e_date">Fecha de Registro</Label>
                            <Input id="e_date" name="created_at" type="date" defaultValue={dateValue} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="e_name">Cliente / Estudiante</Label>
                        <Input id="e_name" name="cliente_estudiante" defaultValue={case_.cliente_estudiante} required />
                    </div>
                    {/* Document checkboxes */}
                    <div className="flex gap-6 py-1">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={solicitud} onCheckedChange={(c) => setSolicitud(!!c)} /> Solicitud CENNI
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={acta} onCheckedChange={(c) => setActa(!!c)} /> Acta o CURP
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={idDoc} onCheckedChange={(c) => setIdDoc(!!c)} /> ID
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="e_cel">Celular</Label>
                            <Input id="e_cel" name="celular" defaultValue={case_.celular || ""} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="e_email">Correo</Label>
                            <Input id="e_email" name="correo" type="email" defaultValue={case_.correo || ""} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="e_cert">Certificado</Label>
                            <Input id="e_cert" name="certificado" defaultValue={case_.certificado || ""} placeholder="LINGUASKILL, OOPT..." />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="e_cliente">Cliente</Label>
                            <Input id="e_cliente" name="cliente" defaultValue={case_.cliente || ""} placeholder="ENSO, LEC, BC..." />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="e_curp">Datos CURP</Label>
                        <Input id="e_curp" name="datos_curp" defaultValue={case_.datos_curp || ""} className="font-mono text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Estatus</Label>
                            <Select name="estatus" defaultValue={case_.estatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Est. Certificado</Label>
                            <Select name="estatus_certificado" defaultValue={case_.estatus_certificado || "__none__"}>
                                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Sin asignar</SelectItem>
                                    {CERT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="e_fec_rec">Fecha Recepción</Label>
                            <Input id="e_fec_rec" name="fecha_recepcion" type="date" defaultValue={case_.fecha_recepcion || ""} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="e_fec_rev">Fecha Revisión</Label>
                            <Input id="e_fec_rev" name="fecha_revision" type="date" defaultValue={case_.fecha_revision || ""} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="e_motivo">Motivo de Rechazo</Label>
                        <Input id="e_motivo" name="motivo_rechazo" defaultValue={case_.motivo_rechazo || ""} placeholder="Razón del rechazo (si aplica)" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="e_notes">Notas</Label>
                        <Input id="e_notes" name="notes" defaultValue={case_.notes || ""} />
                    </div>
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────
function CreateCenniDialog({ open, onOpenChange, onSuccess }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSuccess: () => void;
}) {
    const { t } = useI18n();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [solicitud, setSolicitud] = useState(false);
    const [acta, setActa] = useState(false);
    const [idDoc, setIdDoc] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const fd = new FormData(e.currentTarget);
        try {
            const res = await fetch("/api/v1/cenni", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folio_cenni: fd.get("folio_cenni"),
                    cliente_estudiante: fd.get("cliente_estudiante"),
                    celular: fd.get("celular") || null,
                    correo: fd.get("correo") || null,
                    solicitud_cenni: solicitud,
                    acta_o_curp: acta,
                    id_documento: idDoc,
                    certificado: fd.get("certificado") || null,
                    datos_curp: fd.get("datos_curp") || null,
                    cliente: fd.get("cliente") || null,
                }),
            });
            if (res.ok) {
                toast.success("Registro CENNI creado");
                onSuccess();
                setSolicitud(false); setActa(false); setIdDoc(false);
            } else { toast.error("Error al crear registro"); }
        } catch { toast.error("Error"); }
        finally { setIsSubmitting(false); }
    }, [onSuccess, solicitud, acta, idDoc]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Nuevo Registro CENNI</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="folio_cenni">Folio *</Label>
                            <Input id="folio_cenni" name="folio_cenni" required autoFocus placeholder="322901" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="cliente_estudiante">Cliente / Estudiante *</Label>
                            <Input id="cliente_estudiante" name="cliente_estudiante" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="celular">Celular</Label>
                            <Input id="celular" name="celular" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="correo">Correo</Label>
                            <Input id="correo" name="correo" type="email" />
                        </div>
                    </div>
                    <div className="flex gap-6 py-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={solicitud} onCheckedChange={(c) => setSolicitud(!!c)} /> Solicitud CENNI
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={acta} onCheckedChange={(c) => setActa(!!c)} /> Acta o CURP
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={idDoc} onCheckedChange={(c) => setIdDoc(!!c)} /> ID
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="certificado">Certificado</Label>
                            <Input id="certificado" name="certificado" placeholder="LINGUASKILL, OOPT..." />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="cliente">Cliente</Label>
                            <Input id="cliente" name="cliente" placeholder="ENSO, LEC, BC, EXTERNO..." />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="datos_curp">Datos CURP</Label>
                        <Input id="datos_curp" name="datos_curp" placeholder="LOFA851009MSRPLN07" className="font-mono text-sm" />
                    </div>
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("common.create")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Certificados View ─────────────────────────────────────────────────────────
function CertificadosView({ cases, search, onUpdate }: { cases: CenniCase[]; search: string; onUpdate: () => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [sendDialog, setSendDialog] = useState<{ id: string; email: string } | null>(null);
    const [sendEmail, setSendEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [pdfViewer, setPdfViewer] = useState<{ url: string; nombre: string } | null>(null);

    const handleSendOpen = (c: CenniCase) => {
        setSendEmail(c.correo ?? "");
        setSendDialog({ id: c.id, email: c.correo ?? "" });
    };

    const handleSendConfirm = async () => {
        if (!sendDialog) return;
        setIsSending(true);
        try {
            const res = await fetch(`/api/v1/cenni/${sendDialog.id}/send-certificate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: sendEmail }),
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success(`Certificado enviado a ${sendEmail}`);
                onUpdate();
                setSendDialog(null);
            } else {
                toast.error(body.error ?? "Error al enviar");
            }
        } catch {
            toast.error("Error al enviar");
        } finally {
            setIsSending(false);
        }
    };

    const filtered = cases.filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.folio_cenni.toLowerCase().includes(q)
            || c.cliente_estudiante.toLowerCase().includes(q)
            || (c.correo?.toLowerCase().includes(q) ?? false);
    });

    const handleCertReplace = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingId) return;
        e.target.value = "";
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/v1/cenni/${uploadingId}/certificate-upload`, { method: "POST", body: form });
        if (res.ok) {
            toast.success("Certificado actualizado");
            onUpdate();
        } else {
            const body = await res.json().catch(() => ({}));
            toast.error(body.error || "Error al subir el certificado");
        }
        setUploadingId(null);
    }, [uploadingId, onUpdate]);

    const handleOpen = async (id: string, nombre: string) => {
        const res = await fetch(`/api/v1/cenni/${id}/certificate-url`);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            toast.error(body.error || "No se pudo obtener el certificado");
            return;
        }
        const { url } = await res.json();
        setPdfViewer({ url, nombre });
    };

    const handleDownload = async (id: string, folio: string) => {
        const res = await fetch(`/api/v1/cenni/${id}/certificate-url`);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            toast.error(body.error || "No se pudo descargar");
            return;
        }
        const { url } = await res.json();
        const pdfRes = await fetch(url);
        const blob = await pdfRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${folio}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    };

    if (filtered.length === 0) {
        return (
            <>
                <Card>
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                        <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        No hay certificados emitidos todavía.
                    </CardContent>
                </Card>
                <Dialog open={!!sendDialog} onOpenChange={(open) => { if (!open) setSendDialog(null); }}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Enviar certificado por email</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            <p className="text-sm text-muted-foreground">
                                Se enviará un enlace de descarga válido por 7 días al siguiente correo:
                            </p>
                            <div className="space-y-1">
                                <Label htmlFor="send-email">Correo destinatario</Label>
                                <Input
                                    id="send-email"
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSendDialog(null)} disabled={isSending}>Cancelar</Button>
                            <Button onClick={handleSendConfirm} disabled={isSending || !sendEmail.trim()}>
                                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Folio</th>
                                <th className="px-3 py-2.5 text-left font-medium">Alumno</th>
                                <th className="px-3 py-2.5 text-left font-medium">Correo</th>
                                <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Emitido</th>
                                <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Enviado</th>
                                <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c) => (
                                <tr key={c.id} className="border-b hover:bg-muted/40">
                                    <td className="px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap">{c.folio_cenni}</td>
                                    <td className="px-3 py-2 text-xs font-medium">{c.cliente_estudiante}</td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.correo || "—"}</td>
                                    <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap font-mono">
                                        {c.certificate_uploaded_at
                                            ? new Date(c.certificate_uploaded_at).toLocaleDateString("es-MX")
                                            : "—"}
                                    </td>
                                    <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                                        {c.certificate_sent_at ? (
                                            <span className="text-green-600">
                                                {new Date(c.certificate_sent_at).toLocaleDateString("es-MX")}
                                                {c.certificate_sent_to && (
                                                    <span className="block text-[10px] text-muted-foreground">{c.certificate_sent_to}</span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">No enviado</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                        <div className="flex justify-center gap-1.5">
                                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleOpen(c.id, c.cliente_estudiante)} title="Ver PDF">
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleDownload(c.id, c.folio_cenni)} title="Descargar">
                                                <Download className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setUploadingId(c.id); fileInputRef.current?.click(); }} title="Reemplazar PDF">
                                                <Upload className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleSendOpen(c)} title="Enviar por email">
                                                <Mail className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleCertReplace}
                />
            </CardContent>

            <Dialog open={!!pdfViewer} onOpenChange={(open) => { if (!open) setPdfViewer(null); }}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
                        <DialogTitle className="text-sm font-medium truncate">
                            {pdfViewer?.nombre}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 p-4">
                        {pdfViewer?.url && (
                            <iframe
                                src={pdfViewer.url}
                                className="w-full h-full rounded border"
                                title="Certificado PDF"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
