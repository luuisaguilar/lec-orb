"use client";

import { createElement, useState, useCallback } from "react";
import useSWR from "swr";
import { Plus, Search, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { getIcon } from "@/lib/icon-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import DynamicForm from "@/components/dynamic/DynamicForm";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ModuleField {
    id: string;
    module_id: string;
    name: string;           // key in JSONB data
    label: string;
    field_type: string;     // text|number|currency|date|select|boolean|email|phone|status|relation
    is_required: boolean;
    default_value: string | null;
    options: any;           // {choices?, relation_table?, formula?, stages?}
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
    module: {
        id: string;
        slug: string;
        name: string;
        icon: string;
        description?: string;
        config?: any;
    };
    fields: ModuleField[];
    orgId: string;
    userRole: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatFieldValue(field: ModuleField, value: any): React.ReactNode {
    if (value === null || value === undefined || value === "") return <span className="text-muted-foreground/50">—</span>;

    switch (field.field_type) {
        case "boolean":
            return value ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">Sí</Badge>
            ) : (
                <Badge variant="outline">No</Badge>
            );
        case "currency":
            return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
        case "status": {
            const stages: string[] = field.options?.stages ?? [];
            const idx = stages.indexOf(value);
            const colors = ["bg-zinc-100 text-zinc-800", "bg-blue-100 text-blue-800", "bg-yellow-100 text-yellow-800", "bg-green-100 text-green-800", "bg-red-100 text-red-800"];
            return <Badge className={colors[idx % colors.length] ?? colors[0]}>{value}</Badge>;
        }
        case "date":
            return new Date(value).toLocaleDateString("es-MX");
        case "datetime":
            return new Date(value).toLocaleString("es-MX");
        default:
            return String(value);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DynamicModule Component — generic table view for custom modules
// ─────────────────────────────────────────────────────────────────────────────

export default function DynamicModule({ module, fields, orgId, userRole }: DynamicModuleProps) {
    const [search, setSearch] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const apiUrl = `/api/v1/modules/${module.slug}/records`;
    const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher);

    const isAdmin = userRole === "admin";
    const isSupervisorOrAbove = ["admin", "supervisor"].includes(userRole);

    const records: ModuleRecord[] = data?.records ?? [];
    const listFields = fields.filter((f) => f.show_in_list);

    // Client-side search (server-side search deferred to later)
    const filtered = records.filter((r) => {
        if (!search) return true;
        const text = JSON.stringify(r.data).toLowerCase();
        return text.includes(search.toLowerCase());
    });

    const handleCreated = useCallback(() => {
        setShowCreateDialog(false);
        mutate();
    }, [mutate]);


    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {createElement(getIcon(module.icon), { className: "h-5 w-5 text-primary" })}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{module.name}</h1>
                        {module.description && (
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/studio/${module.slug}`}>
                                <Settings className="h-4 w-4" />
                                Configurar
                            </Link>
                        </Button>
                    )}
                    {isSupervisorOrAbove && (
                        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo registro
                        </Button>
                    )}
                </div>
            </div>

            {/* Search + Refresh bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`Buscar en ${module.name}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button variant="ghost" size="icon" onClick={() => mutate()} title="Refrescar">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Empty state: no fields configured */}
            {fields.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                    <Settings className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg">Sin campos configurados</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Este módulo no tiene campos definidos aún. Configúralo desde el Studio.
                    </p>
                    {isAdmin && (
                        <Button className="mt-4" asChild>
                            <Link href={`/dashboard/studio/${module.slug}`}>
                                Abrir Studio
                            </Link>
                        </Button>
                    )}
                </div>
            )}

            {/* Data table */}
            {fields.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                {listFields.map((field) => (
                                    <TableHead key={field.id} className="font-semibold">
                                        {field.label}
                                    </TableHead>
                                ))}
                                <TableHead className="w-24 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={listFields.length + 1} className="py-10 text-center text-muted-foreground">
                                        <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                                        Cargando...
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && error && (
                                <TableRow>
                                    <TableCell colSpan={listFields.length + 1} className="py-10 text-center text-destructive">
                                        Error al cargar registros.
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && !error && filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={listFields.length + 1} className="py-10 text-center text-muted-foreground">
                                        {search ? "Sin resultados para esa búsqueda." : "Sin registros todavía."}
                                    </TableCell>
                                </TableRow>
                            )}
                            {filtered.map((record) => (
                                <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                                    {listFields.map((field) => (
                                        <TableCell key={field.id}>
                                            {formatFieldValue(field, record.data[field.name])}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/m/${module.slug}/${record.id}`}>
                                                Ver
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Nuevo registro — {module.name}</DialogTitle>
                    </DialogHeader>
                    <DynamicForm
                        moduleSlug={module.slug}
                        fields={fields}
                        onSuccess={handleCreated}
                        onCancel={() => setShowCreateDialog(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
