"use client";

import { createElement, useState, useCallback } from "react";
import useSWR from "swr";
import { Plus, Search, RefreshCw, Settings, LayoutList, Columns3 } from "lucide-react";
import Link from "next/link";
import { getIcon } from "@/lib/icon-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import DynamicForm from "@/components/dynamic/DynamicForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ModuleField {
    id: string;
    module_id: string;
    name: string;
    label: string;
    field_type: string;
    is_required: boolean;
    default_value: string | null;
    options: any;
    sort_order: number;
    show_in_list: boolean;
    is_searchable: boolean;
}

export interface ModuleRecord {
    id: string;
    module_id: string;
    org_id: string;
    data: Record<string, any>;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

interface DynamicModuleProps {
    module: { id: string; slug: string; name: string; icon: string; description?: string; config?: any };
    fields: ModuleField[];
    orgId: string;
    userRole: string;
}

// ── Colors ───────────────────────────────────────────────────────────────────

const STAGE_COLORS = [
    "bg-zinc-100 text-zinc-700",
    "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-800",
    "bg-red-100 text-red-700",
];

function stageColor(stages: string[], value: string) {
    const idx = stages.indexOf(value);
    return STAGE_COLORS[Math.max(0, idx) % STAGE_COLORS.length];
}

// ── Field value formatter ─────────────────────────────────────────────────────

function formatValue(field: ModuleField, value: any): React.ReactNode {
    if (value === null || value === undefined || value === "")
        return <span className="text-muted-foreground/40 text-xs">—</span>;
    switch (field.field_type) {
        case "boolean":
            return value
                ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">Sí</Badge>
                : <Badge variant="outline" className="text-xs">No</Badge>;
        case "currency":
            return <span className="font-medium tabular-nums">{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value))}</span>;
        case "status": {
            const stages: string[] = field.options?.stages ?? [];
            return <Badge className={cn("text-xs font-medium", stageColor(stages, String(value)))}>{value}</Badge>;
        }
        case "select":
            return <Badge variant="outline" className="text-xs">{value}</Badge>;
        case "date":
            return new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
        case "email":
            return <span className="text-blue-600 text-sm">{value}</span>;
        default:
            return <span className="text-sm">{String(value)}</span>;
    }
}

// ── Kanban card ───────────────────────────────────────────────────────────────

function KanbanCard({ record, listFields, moduleSlug }: { record: ModuleRecord; listFields: ModuleField[]; moduleSlug: string }) {
    const titleField = listFields[0];
    const subFields = listFields.slice(1, 4);
    return (
        <Link href={`/dashboard/m/${moduleSlug}/${record.id}`}
            className="block rounded-xl border bg-card p-3.5 shadow-sm hover:shadow-md transition-shadow group">
            <p className="font-semibold text-sm leading-snug mb-2 group-hover:text-primary transition-colors truncate">
                {titleField ? String(record.data[titleField.name] ?? "Sin título") : "Sin título"}
            </p>
            <div className="space-y-1.5">
                {subFields.map((f) => {
                    const v = record.data[f.name];
                    if (!v) return null;
                    return (
                        <div key={f.id} className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-muted-foreground shrink-0">{f.label}:</span>
                            <span className="truncate">{formatValue(f, v)}</span>
                        </div>
                    );
                })}
            </div>
        </Link>
    );
}

// ── Kanban view ───────────────────────────────────────────────────────────────

function KanbanView({ records, statusField, listFields, moduleSlug }: {
    records: ModuleRecord[];
    statusField: ModuleField;
    listFields: ModuleField[];
    moduleSlug: string;
}) {
    const stages: string[] = statusField.options?.stages ?? [];
    const noStage = records.filter((r) => !stages.includes(r.data[statusField.name]));

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
            {stages.map((stage, idx) => {
                const stageRecords = records.filter((r) => r.data[statusField.name] === stage);
                return (
                    <div key={stage} className="shrink-0 w-60">
                        <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg mb-3", STAGE_COLORS[idx % STAGE_COLORS.length])}>
                            <span className="text-xs font-bold uppercase tracking-wide">{stage}</span>
                            <span className="text-xs font-semibold opacity-70">{stageRecords.length}</span>
                        </div>
                        <div className="space-y-2.5">
                            {stageRecords.length === 0
                                ? <div className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">Sin registros</div>
                                : stageRecords.map((r) => <KanbanCard key={r.id} record={r} listFields={listFields} moduleSlug={moduleSlug} />)
                            }
                        </div>
                    </div>
                );
            })}
            {noStage.length > 0 && (
                <div className="shrink-0 w-60">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-3 bg-muted text-muted-foreground">
                        <span className="text-xs font-bold uppercase tracking-wide">Sin etapa</span>
                        <span className="text-xs font-semibold">{noStage.length}</span>
                    </div>
                    <div className="space-y-2.5">
                        {noStage.map((r) => <KanbanCard key={r.id} record={r} listFields={listFields} moduleSlug={moduleSlug} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── DynamicModule ─────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DynamicModule({ module, fields, userRole }: DynamicModuleProps) {
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [view, setView] = useState<"table" | "kanban">("table");

    const { data, error, isLoading, mutate } = useSWR(`/api/v1/modules/${module.slug}/records`, fetcher);

    const isAdmin = userRole === "admin";
    const canCreate = ["admin", "supervisor"].includes(userRole);
    const records: ModuleRecord[] = data?.records ?? [];
    const listFields = fields.filter((f) => f.show_in_list);
    const statusField = fields.find((f) => f.field_type === "status");
    const hasKanban = !!statusField && listFields.length > 0;

    const filtered = records.filter((r) =>
        !search || JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase())
    );

    const handleCreated = useCallback(() => { setShowCreate(false); mutate(); }, [mutate]);
    const ModuleIcon = getIcon(module.icon);

    return (
        <div className="flex flex-col gap-5 p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                        {createElement(ModuleIcon, { className: "h-5 w-5 text-primary" })}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{module.name}</h1>
                        {module.description && <p className="text-sm text-muted-foreground">{module.description}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                            <Link href={`/dashboard/studio/${module.slug}`}>
                                <Settings className="h-4 w-4 mr-1.5" />Configurar
                            </Link>
                        </Button>
                    )}
                    {canCreate && (
                        <Button size="sm" onClick={() => setShowCreate(true)}>
                            <Plus className="h-4 w-4 mr-1.5" />Nuevo registro
                        </Button>
                    )}
                </div>
            </div>

            {/* No fields */}
            {fields.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
                    <Settings className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg">Sin campos configurados</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">Configúralo desde el Studio.</p>
                    {isAdmin && <Button className="mt-4" asChild><Link href={`/dashboard/studio/${module.slug}`}>Abrir Studio</Link></Button>}
                </div>
            )}

            {/* Toolbar + content */}
            {fields.length > 0 && (
                <>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder={`Buscar en ${module.name}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                            {hasKanban && (
                                <div className="flex rounded-lg border bg-muted/40 p-0.5 gap-0.5">
                                    <Button variant="ghost" size="sm" onClick={() => setView("table")}
                                        className={cn("h-7 px-2.5", view === "table" && "bg-background shadow-sm")}>
                                        <LayoutList className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setView("kanban")}
                                        className={cn("h-7 px-2.5", view === "kanban" && "bg-background shadow-sm")}>
                                        <Columns3 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => mutate()}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            {filtered.length > 0 && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Kanban */}
                    {view === "kanban" && hasKanban && statusField ? (
                        <KanbanView records={filtered} statusField={statusField} listFields={listFields} moduleSlug={module.slug} />
                    ) : (
                        /* Table */
                        <div className="rounded-xl border bg-card overflow-hidden">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-20 text-muted-foreground">
                                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />Cargando...
                                </div>
                            ) : error ? (
                                <div className="flex items-center justify-center py-20 text-destructive text-sm">Error al cargar registros.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            {listFields.map((f) => (
                                                <TableHead key={f.id} className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{f.label}</TableHead>
                                            ))}
                                            <TableHead className="w-20 text-right text-xs uppercase tracking-wide text-muted-foreground">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={listFields.length + 1} className="py-16 text-center text-muted-foreground text-sm">
                                                    {search ? "Sin resultados." : "Sin registros todavía."}
                                                </TableCell>
                                            </TableRow>
                                        ) : filtered.map((record) => (
                                            <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                                                {listFields.map((f) => (
                                                    <TableCell key={f.id} className="py-3">{formatValue(f, record.data[f.name])}</TableCell>
                                                ))}
                                                <TableCell className="text-right py-3">
                                                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                                        <Link href={`/dashboard/m/${module.slug}/${record.id}`}>Ver</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Create dialog — max height con scroll para que no se salga de pantalla */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col gap-0 p-0">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                {createElement(ModuleIcon, { className: "h-4 w-4 text-primary" })}
                            </div>
                            Nuevo registro — {module.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 px-6 py-4">
                        <DynamicForm
                            moduleSlug={module.slug}
                            fields={fields}
                            onSuccess={handleCreated}
                            onCancel={() => setShowCreate(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
