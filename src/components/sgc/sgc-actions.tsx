"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    CalendarClock,
    CheckCircle2,
    Loader2,
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    Wrench,
    ShieldAlert,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fetcher = async (url: string) => {
    const response = await fetch(url);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Error cargando acciones");
    return body;
};

const actionSchema = z.object({
    title: z.string().min(1, "El titulo es obligatorio"),
    description: z.string().optional(),
    type_action: z.enum(["immediate", "correction", "prevention", "improvement"]),
    priority: z.enum(["low", "normal"]),
    status: z.enum(["draft", "open", "in_progress", "done", "cancel"]),
    stage_id: z.string().optional(),
    deadline_at: z.string().optional(),
});

type ActionFormValues = z.infer<typeof actionSchema>;

type SgcAction = {
    id: string;
    ref: string;
    title: string;
    description: string | null;
    type_action: "immediate" | "correction" | "prevention" | "improvement";
    priority: "low" | "normal";
    status: "draft" | "open" | "in_progress" | "done" | "cancel";
    stage_id: string | null;
    deadline_at: string | null;
    created_at: string;
    updated_at: string;
};

type StageOption = { id: string; name: string; state: string };

const STATUS_LABEL: Record<SgcAction["status"], string> = {
    draft: "Borrador",
    open: "Abierta",
    in_progress: "En progreso",
    done: "Completada",
    cancel: "Cancelada",
};

const STATUS_STYLE: Record<SgcAction["status"], string> = {
    draft: "bg-slate-700 text-slate-100",
    open: "bg-blue-900/70 text-blue-200",
    in_progress: "bg-amber-900/70 text-amber-200",
    done: "bg-emerald-900/70 text-emerald-200",
    cancel: "bg-rose-900/70 text-rose-200",
};

const TYPE_LABEL: Record<SgcAction["type_action"], string> = {
    immediate: "Inmediata",
    correction: "Correccion",
    prevention: "Prevencion",
    improvement: "Mejora",
};

function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

export default function SGCActions() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { hasPermission, isAdmin, isLoading: userLoading } = useUser();

    const query = useMemo(() => {
        const params = new URLSearchParams({ page: "1", limit: "200" });
        if (search.trim()) params.set("q", search.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (typeFilter !== "all") params.set("type_action", typeFilter);
        return `/api/v1/sgc/actions?${params.toString()}`;
    }, [search, statusFilter, typeFilter]);

    const { data, isLoading, mutate } = useSWR(query, fetcher);
    const { data: stagesData } = useSWR("/api/v1/sgc/catalogs/stages?kind=action", fetcher);
    const items: SgcAction[] = useMemo(() => data?.actions ?? [], [data?.actions]);
    const stages: StageOption[] = useMemo(() => stagesData?.stages ?? [], [stagesData?.stages]);
    const stageMap = useMemo(() => new Map(stages.map((stage) => [stage.id, stage.name])), [stages]);

    const form = useForm<ActionFormValues>({
        resolver: zodResolver(actionSchema) as any,
        defaultValues: {
            title: "",
            description: "",
            type_action: "immediate",
            priority: "normal",
            status: "draft",
            stage_id: "",
            deadline_at: "",
        },
    });

    const counters = useMemo(() => ({
        total: items.length,
        done: items.filter((item) => item.status === "done").length,
        open: items.filter((item) => item.status === "open" || item.status === "in_progress").length,
        urgent: items.filter((item) => item.priority === "normal" && item.status !== "done" && item.status !== "cancel").length,
    }), [items]);

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
            <div className="flex items-center justify-center h-64 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Validando permisos...
            </div>
        );
    }

    const openCreate = () => {
        setEditingId(null);
        form.reset({
            title: "",
            description: "",
            type_action: "immediate",
            priority: "normal",
            status: "draft",
            stage_id: "",
            deadline_at: "",
        });
        setDialogOpen(true);
    };

    const openEdit = async (id: string) => {
        setEditingId(id);
        setDialogOpen(true);
        setLoadingDetails(true);
        try {
            const detail = await fetcher(`/api/v1/sgc/actions/${id}`);
            const action: SgcAction = detail.action;
            form.reset({
                title: action.title,
                description: action.description ?? "",
                type_action: action.type_action,
                priority: action.priority,
                status: action.status,
                stage_id: action.stage_id ?? "",
                deadline_at: action.deadline_at ?? "",
            });
        } catch (error: any) {
            toast.error(error.message ?? "No se pudo cargar la accion");
            setDialogOpen(false);
            setEditingId(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const submit = form.handleSubmit(async (values) => {
        setSaving(true);
        try {
            const payload = {
                title: values.title.trim(),
                description: values.description?.trim() || null,
                type_action: values.type_action,
                priority: values.priority,
                status: values.status,
                stage_id: values.stage_id || null,
                deadline_at: values.deadline_at || null,
            };

            const url = editingId ? `/api/v1/sgc/actions/${editingId}` : "/api/v1/sgc/actions";
            const method = editingId ? "PATCH" : "POST";
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la accion");

            toast.success(editingId ? "Accion actualizada" : "Accion creada");
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

    const cancelAction = async (id: string) => {
        setDeletingId(id);
        try {
            const response = await fetch(`/api/v1/sgc/actions/${id}`, { method: "DELETE" });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error ?? "No se pudo cancelar la accion");
            toast.success("Accion cancelada");
            await mutate();
        } catch (error: any) {
            toast.error(error.message ?? "Error al cancelar accion");
        } finally {
            setDeletingId(null);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Acciones CAPA</h3>
                    <p className="text-sm text-slate-400">Planeacion, ejecucion y cierre de acciones correctivas/preventivas.</p>
                </div>
                {hasPermission("sgc", "edit") && (
                    <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Accion
                    </Button>
                )}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <StatCard icon={<Wrench className="w-4 h-4 text-primary" />} label="Total acciones" value={String(counters.total)} />
                <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} label="Completadas" value={String(counters.done)} />
                <StatCard icon={<CalendarClock className="w-4 h-4 text-blue-400" />} label="Abiertas / En progreso" value={String(counters.open)} />
                <StatCard icon={<ShieldCheck className="w-4 h-4 text-amber-400" />} label="Prioridad normal activas" value={String(counters.urgent)} />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                        className="pl-9 bg-slate-900/50 border-slate-700"
                        placeholder="Buscar por ref, titulo o descripcion..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700 w-[180px]">
                            <SelectValue placeholder="Estatus" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estatus</SelectItem>
                            {Object.entries(STATUS_LABEL).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700 w-[180px]">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            {Object.entries(TYPE_LABEL).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Cargando acciones...
                </div>
            ) : (
                <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-800/60">
                        <CardTitle className="text-sm uppercase tracking-widest text-slate-400">Listado CAPA</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-950/40 border-b border-slate-800/60">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500">Ref</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500">Titulo</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500">Tipo</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500">Etapa</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500">Estatus</th>
                                        <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-500">Fecha limite</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-widest text-slate-500">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                                                Sin acciones para los filtros actuales.
                                            </td>
                                        </tr>
                                    )}
                                    {items.map((item) => (
                                        <tr key={item.id} className="border-b border-slate-800/40 hover:bg-white/5">
                                            <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{item.ref}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-slate-100">{item.title}</p>
                                                    <p className="text-xs text-slate-400 line-clamp-2">{item.description || "Sin descripcion"}</p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-slate-300">{TYPE_LABEL[item.type_action]}</td>
                                            <td className="px-3 py-2.5 text-xs text-slate-300">{stageMap.get(item.stage_id || "") ?? "Sin etapa"}</td>
                                            <td className="px-3 py-2.5">
                                                <Badge className={`${STATUS_STYLE[item.status]} text-[10px] border-none`}>
                                                    {STATUS_LABEL[item.status]}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-slate-400">{formatDate(item.deadline_at)}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 disabled:opacity-20"
                                                        disabled={!hasPermission("sgc", "edit") || ((item.status === "done" || item.status === "cancel") && !isAdmin)}
                                                        onClick={() => openEdit(item.id)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-20"
                                                        disabled={deletingId === item.id || !hasPermission("sgc", "delete") || ((item.status === "done" || item.status === "cancel") && !isAdmin)}
                                                        onClick={() => cancelAction(item.id)}
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
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Editar Accion CAPA" : "Nueva Accion CAPA"}</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Configura tipo, etapa y compromiso de fecha para controlar cumplimiento.
                        </DialogDescription>
                    </DialogHeader>
                    {loadingDetails ? (
                        <div className="h-36 flex items-center justify-center text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Cargando accion...
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={submit} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Titulo</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ""} className="bg-slate-900/60 border-slate-700" />
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
                                                <Textarea {...field} value={field.value || ""} className="bg-slate-900/60 border-slate-700 min-h-[90px]" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                                    <FormField
                                        control={form.control}
                                        name="type_action"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo</FormLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-900/60 border-slate-700">
                                                            <SelectValue placeholder="Tipo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Object.entries(TYPE_LABEL).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="priority"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prioridad</FormLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-900/60 border-slate-700">
                                                            <SelectValue placeholder="Prioridad" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="low">Baja</SelectItem>
                                                        <SelectItem value="normal">Normal</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estatus</FormLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-900/60 border-slate-700">
                                                            <SelectValue placeholder="Estatus" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="stage_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Etapa</FormLabel>
                                                <Select value={field.value || "__none__"} onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-900/60 border-slate-700">
                                                            <SelectValue placeholder="Etapa" />
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
                                        name="deadline_at"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fecha limite</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        value={field.value || ""}
                                                        onChange={field.onChange}
                                                        className="bg-slate-900/60 border-slate-700"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" className="border-slate-700" onClick={() => setDialogOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {editingId ? "Actualizar accion" : "Crear accion"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-950">{icon}</div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
