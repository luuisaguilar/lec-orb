"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Clock, Database, Filter, RefreshCw, User,
    Plus, Edit2, Trash2, ChevronLeft, ChevronRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Labels ──────────────────────────────────────────────────────────────────
const TABLE_LABELS: Record<string, string> = {
    events: "Eventos",
    event_sessions: "Sesiones",
    event_staff: "Staff de Evento",
    event_slots: "Turnos (Slots)",
    schools: "Colegios",
    applicators: "Aplicadores",
    cenni_registros: "CENNI",
    speaking_packs: "Paquetes Físicos",
    packs: "Paquetes Físicos",
    payroll_periods: "Nómina",
    quotes: "Cotizaciones",
    purchase_orders: "O. de Compra",
    payment_concepts: "Catálogo de Pagos",
    payments: "Pagos",
    toefl_codes: "Códigos TOEFL",
    toefl_administrations: "Exámenes TOEFL",
    org_members: "Miembros de Org.",
    role_permissions: "Permisos de Roles",
};

const OP_CONFIG = {
    INSERT: { label: "Creado", icon: Plus, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    UPDATE: { label: "Editado", icon: Edit2, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    DELETE: { label: "Eliminado", icon: Trash2, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function opConfig(op: string) {
    return OP_CONFIG[op as keyof typeof OP_CONFIG] ?? OP_CONFIG.UPDATE;
}

// ── Diff display ─────────────────────────────────────────────────────────────
function DataDiff({ old_data, new_data, operation }: { old_data: any; new_data: any; operation: string }) {
    if (operation === "INSERT") {
        return <p className="text-xs text-muted-foreground">Registro nuevo creado.</p>;
    }
    if (operation === "DELETE") {
        return <p className="text-xs text-muted-foreground">Registro eliminado.</p>;
    }
    if (!old_data || !new_data) return null;

    const changed = Object.keys(new_data).filter(k => {
        if (k === "updated_at") return false;
        return JSON.stringify(old_data[k]) !== JSON.stringify(new_data[k]);
    });

    if (changed.length === 0) return <p className="text-xs text-muted-foreground italic">Sin cambios detectados.</p>;

    return (
        <div className="mt-2 space-y-1">
            {changed.map(field => (
                <div key={field} className="text-xs">
                    <span className="font-mono text-muted-foreground">{field}: </span>
                    <span className="line-through text-red-500/70 mr-1">{JSON.stringify(old_data[field])}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{JSON.stringify(new_data[field])}</span>
                </div>
            ))}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 25;

export default function ActividadPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [filterTable, setFilterTable] = useState<string>("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(page * PAGE_SIZE),
            });
            if (filterTable !== "all") params.set("table", filterTable);

            const res = await fetch(`/api/v1/audit-logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setTotal(data.pagination?.total || 0);
            }
        } finally {
            setIsLoading(false);
        }
    }, [page, filterTable]);

    useEffect(() => {
        setPage(0);
    }, [filterTable]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Clock className="h-6 w-6 text-primary" /> Actividad de la Plataforma
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Historial completo de cambios en todos los módulos.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Actualizar
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterTable} onValueChange={setFilterTable}>
                    <SelectTrigger className="w-[200px] h-8">
                        <SelectValue placeholder="Todos los módulos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los módulos</SelectItem>
                        {Object.entries(TABLE_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground ml-auto">
                    {total} registros en total
                </span>
            </div>

            {/* Log Feed */}
            <Card>
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Database className="h-4 w-4" /> Registro de Cambios
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-16 text-center text-muted-foreground animate-pulse text-sm">
                            Cargando historial...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-sm">
                            No hay actividad registrada aún.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {logs.map(log => {
                                const cfg = opConfig(log.operation);
                                const Icon = cfg.icon;
                                const isExpanded = expandedId === log.id;
                                const userName = log.profiles?.full_name || "Sistema";
                                return (
                                    <div
                                        key={log.id}
                                        className="px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn("mt-0.5 p-1.5 rounded-md shrink-0", cfg.cls)}>
                                                <Icon className="h-3 w-3" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                                        {TABLE_LABELS[log.table_name] || log.table_name}
                                                    </Badge>
                                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.cls)}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {userName}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {format(new Date(log.changed_at), "dd MMM yyyy HH:mm", { locale: es })}
                                                    {" · "}
                                                    {formatDistanceToNow(new Date(log.changed_at), { addSuffix: true, locale: es })}
                                                </p>
                                                {isExpanded && (
                                                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                                        <p className="font-mono text-muted-foreground mb-1">ID: {log.record_id}</p>
                                                        <DataDiff
                                                            old_data={log.old_data}
                                                            new_data={log.new_data}
                                                            operation={log.operation}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8"
                        disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Pág. {page + 1} de {totalPages}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8"
                        disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
