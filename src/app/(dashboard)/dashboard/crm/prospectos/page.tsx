"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
    Plus, Search, Loader2, UserSearch, Phone, Mail, Building2,
    MoreHorizontal, MessageSquare, X, ChevronRight, Clock, Tag,
    LayoutList, Kanban, Filter, FileText,
} from "lucide-react";
import { toast } from "sonner";

import { AddQuoteDialog } from "@/components/finance/add-quote-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ProspectStatus = "nuevo" | "contactado" | "calificado" | "cotizado" | "inscrito" | "perdido";
type ProspectSource = "visita" | "whatsapp" | "telefono" | "web" | "referido" | "otro";
type ActivityType = "nota" | "llamada" | "whatsapp" | "correo" | "visita" | "cotizacion" | "seguimiento";

interface Activity {
    id: string;
    type: ActivityType;
    notes: string;
    activity_at: string;
    performer?: { id: string; email: string } | null;
}

interface Prospect {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    company: string | null;
    status: ProspectStatus;
    source: ProspectSource;
    service_interest: string | null;
    estimated_value: number | null;
    notes: string | null;
    assigned_to: string | null;
    last_contact_at: string | null;
    next_followup_at: string | null;
    closed_at: string | null;
    lost_reason: string | null;
    created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_PIPELINE: ProspectStatus[] = [
    "nuevo", "contactado", "calificado", "cotizado", "inscrito", "perdido",
];

const STATUS_LABELS: Record<ProspectStatus, string> = {
    nuevo: "Nuevo",
    contactado: "Contactado",
    calificado: "Calificado",
    cotizado: "Cotizado",
    inscrito: "Inscrito",
    perdido: "Perdido",
};

const STATUS_COLORS: Record<ProspectStatus, string> = {
    nuevo: "bg-slate-100 text-slate-700 border-slate-200",
    contactado: "bg-blue-50 text-blue-700 border-blue-200",
    calificado: "bg-amber-50 text-amber-700 border-amber-200",
    cotizado: "bg-purple-50 text-purple-700 border-purple-200",
    inscrito: "bg-emerald-50 text-emerald-700 border-emerald-200",
    perdido: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_COLUMN_BG: Record<ProspectStatus, string> = {
    nuevo: "bg-slate-50 border-slate-200",
    contactado: "bg-blue-50/50 border-blue-100",
    calificado: "bg-amber-50/50 border-amber-100",
    cotizado: "bg-purple-50/50 border-purple-100",
    inscrito: "bg-emerald-50/50 border-emerald-100",
    perdido: "bg-red-50/50 border-red-100",
};

const SOURCE_LABELS: Record<ProspectSource, string> = {
    visita: "Visita",
    whatsapp: "WhatsApp",
    telefono: "Teléfono",
    web: "Web",
    referido: "Referido",
    otro: "Otro",
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
    nota: "Nota",
    llamada: "Llamada",
    whatsapp: "WhatsApp",
    correo: "Correo",
    visita: "Visita",
    cotizacion: "Cotización",
    seguimiento: "Seguimiento",
};

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const prospectSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    phone: z.string().optional().nullable(),
    email: z.string().email("Email inválido").optional().or(z.literal("")).nullable(),
    company: z.string().optional().nullable(),
    status: z.enum(["nuevo", "contactado", "calificado", "cotizado", "inscrito", "perdido"]).default("nuevo"),
    source: z.enum(["visita", "whatsapp", "telefono", "web", "referido", "otro"]).default("visita"),
    service_interest: z.string().optional().nullable(),
    estimated_value: z.coerce.number().positive().optional().nullable(),
    notes: z.string().optional().nullable(),
    next_followup_at: z.string().optional().nullable(),
});

const activitySchema = z.object({
    type: z.enum(["nota", "llamada", "whatsapp", "correo", "visita", "cotizacion", "seguimiento"]).default("nota"),
    notes: z.string().min(1, "La nota es requerida"),
});

type ProspectFormValues = z.input<typeof prospectSchema>;
type ActivityFormValues = z.input<typeof activitySchema>;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProspectStatus }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prospect Form Dialog (create + edit)
// ─────────────────────────────────────────────────────────────────────────────

function ProspectFormDialog({
    open,
    onClose,
    prospect,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    prospect?: Prospect | null;
    onSaved: () => void;
}) {
    const isEdit = !!prospect;
    const form = useForm<ProspectFormValues>({
        resolver: zodResolver(prospectSchema),
        defaultValues: {
            name: prospect?.name ?? "",
            phone: prospect?.phone ?? "",
            email: prospect?.email ?? "",
            company: prospect?.company ?? "",
            status: prospect?.status ?? "nuevo",
            source: prospect?.source ?? "visita",
            service_interest: prospect?.service_interest ?? "",
            estimated_value: prospect?.estimated_value ?? undefined,
            notes: prospect?.notes ?? "",
            next_followup_at: prospect?.next_followup_at
                ? prospect.next_followup_at.slice(0, 16)
                : "",
        },
    });

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = form;

    const onSubmit = async (values: ProspectFormValues) => {
        const payload = {
            ...values,
            email: values.email || null,
            phone: values.phone || null,
            company: values.company || null,
            service_interest: values.service_interest || null,
            estimated_value: values.estimated_value || null,
            notes: values.notes || null,
            next_followup_at: values.next_followup_at
                ? new Date(values.next_followup_at).toISOString()
                : null,
        };

        const url = isEdit ? `/api/v1/crm/prospects/${prospect!.id}` : "/api/v1/crm/prospects";
        const method = isEdit ? "PATCH" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            toast.error(isEdit ? "Error al actualizar prospecto" : "Error al crear prospecto");
            return;
        }

        toast.success(isEdit ? "Prospecto actualizado" : "Prospecto creado");
        reset();
        onSaved();
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar prospecto" : "Nuevo prospecto"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <Label>Nombre *</Label>
                            <Input {...register("name")} placeholder="Nombre completo" />
                            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                        </div>

                        <div>
                            <Label>Teléfono</Label>
                            <Input {...register("phone")} placeholder="+52 55 1234 5678" />
                        </div>

                        <div>
                            <Label>Email</Label>
                            <Input {...register("email")} placeholder="correo@ejemplo.com" type="email" />
                            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                        </div>

                        <div className="col-span-2">
                            <Label>Empresa / Institución</Label>
                            <Input {...register("company")} placeholder="Colegio, empresa..." />
                        </div>

                        <div>
                            <Label>Origen</Label>
                            <Select
                                defaultValue={watch("source")}
                                onValueChange={(v) => setValue("source", v as ProspectSource)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(SOURCE_LABELS) as ProspectSource[]).map((s) => (
                                        <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Estatus</Label>
                            <Select
                                defaultValue={watch("status")}
                                onValueChange={(v) => setValue("status", v as ProspectStatus)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_PIPELINE.map((s) => (
                                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Servicio de interés</Label>
                            <Input {...register("service_interest")} placeholder="TOEFL, Cambridge, CENNI..." />
                        </div>

                        <div>
                            <Label>Valor estimado (MXN)</Label>
                            <Input {...register("estimated_value")} type="number" min={0} placeholder="0.00" />
                        </div>

                        <div className="col-span-2">
                            <Label>Próximo seguimiento</Label>
                            <Input {...register("next_followup_at")} type="datetime-local" />
                        </div>

                        <div className="col-span-2">
                            <Label>Notas</Label>
                            <Textarea {...register("notes")} placeholder="Contexto, observaciones..." rows={3} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? "Guardar cambios" : "Crear prospecto"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Dialog
// ─────────────────────────────────────────────────────────────────────────────

function ActivityDialog({
    prospectId,
    open,
    onClose,
    onSaved,
}: {
    prospectId: string;
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const form = useForm<ActivityFormValues>({
        resolver: zodResolver(activitySchema),
        defaultValues: { type: "nota", notes: "" },
    });

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = form;

    const onSubmit = async (values: ActivityFormValues) => {
        const res = await fetch(`/api/v1/crm/prospects/${prospectId}/activities`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });

        if (!res.ok) {
            toast.error("Error al guardar actividad");
            return;
        }

        toast.success("Actividad registrada");
        reset();
        onSaved();
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Registrar actividad</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label>Tipo</Label>
                        <Select
                            defaultValue={watch("type")}
                            onValueChange={(v) => setValue("type", v as ActivityType)}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((t) => (
                                    <SelectItem key={t} value={t}>{ACTIVITY_LABELS[t]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Nota *</Label>
                        <Textarea {...register("notes")} placeholder="¿Qué pasó en esta interacción?" rows={4} />
                        {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes.message}</p>}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prospect Detail Sheet
// ─────────────────────────────────────────────────────────────────────────────

function ProspectDetail({
    prospect,
    onClose,
    onEdit,
    onDelete,
    onActivitySaved,
}: {
    prospect: Prospect;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onActivitySaved: () => void;
}) {
    const [activityOpen, setActivityOpen] = useState(false);
    const [quoteOpen, setQuoteOpen] = useState(false);
    const { data, mutate } = useSWR(`/api/v1/crm/prospects/${prospect.id}`, fetcher);
    const activities: Activity[] = data?.prospect?.activities ?? [];

    const handleStatusChange = async (status: ProspectStatus) => {
        const res = await fetch(`/api/v1/crm/prospects/${prospect.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (res.ok) {
            toast.success(`Movido a "${STATUS_LABELS[status]}"`);
            onActivitySaved();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-start justify-between gap-2 pb-4 border-b">
                <div>
                    <h2 className="text-lg font-semibold">{prospect.name}</h2>
                    {prospect.company && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />{prospect.company}
                        </p>
                    )}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>

            <div className="flex flex-wrap gap-2 py-3 border-b">
                <StatusBadge status={prospect.status} />
                <Badge variant="outline">{SOURCE_LABELS[prospect.source]}</Badge>
                {prospect.service_interest && (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />{prospect.service_interest}
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-b text-sm">
                {prospect.phone && (
                    <a href={`tel:${prospect.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                        <Phone className="h-3.5 w-3.5" />{prospect.phone}
                    </a>
                )}
                {prospect.email && (
                    <a href={`mailto:${prospect.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground truncate">
                        <Mail className="h-3.5 w-3.5" />{prospect.email}
                    </a>
                )}
                {prospect.next_followup_at && (
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                        <Clock className="h-3.5 w-3.5" />
                        Seguimiento: {format(new Date(prospect.next_followup_at), "dd MMM yyyy HH:mm", { locale: es })}
                    </div>
                )}
                {prospect.estimated_value && (
                    <div className="text-muted-foreground col-span-2">
                        Valor estimado: <span className="font-medium text-foreground">
                            ${prospect.estimated_value.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                        </span>
                    </div>
                )}
                {prospect.notes && (
                    <p className="col-span-2 text-muted-foreground italic">{prospect.notes}</p>
                )}
            </div>

            {/* Pipeline mover */}
            <div className="py-3 border-b">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Mover a etapa</p>
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_PIPELINE.filter((s) => s !== prospect.status).map((s) => (
                        <button
                            key={s}
                            onClick={() => handleStatusChange(s)}
                            className={`text-xs px-2 py-1 rounded-full border transition-all hover:opacity-80 ${STATUS_COLORS[s]}`}
                        >
                            {STATUS_LABELS[s]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Activities timeline */}
            <div className="flex-1 overflow-y-auto py-3">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Actividad</p>
                    <Button size="sm" variant="outline" onClick={() => setActivityOpen(true)}>
                        <Plus className="h-3 w-3 mr-1" />Registrar
                    </Button>
                </div>

                {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin actividad registrada</p>
                ) : (
                    <div className="space-y-3">
                        {activities.map((act) => (
                            <div key={act.id} className="flex gap-2.5">
                                <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0 ring-2 ring-primary/20" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-medium">{ACTIVITY_LABELS[act.type]}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(act.activity_at), { locale: es, addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">{act.notes}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-3 border-t flex-wrap">
                <Button className="flex-1" variant="outline" onClick={onEdit}>Editar</Button>
                <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => setQuoteOpen(true)}
                >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />Cotización
                </Button>
                <Button className="w-full" variant="destructive" onClick={onDelete}>Eliminar</Button>
            </div>

            <ActivityDialog
                prospectId={prospect.id}
                open={activityOpen}
                onClose={() => setActivityOpen(false)}
                onSaved={() => { mutate(); onActivitySaved(); }}
            />

            <AddQuoteDialog
                prospect={prospect}
                open={quoteOpen}
                onOpenChange={setQuoteOpen}
                onSuccess={() => {
                    toast.success("Cotización creada y vinculada al prospecto");
                    mutate();
                }}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Kanban Card
// ─────────────────────────────────────────────────────────────────────────────

function KanbanCard({ prospect, onClick }: { prospect: Prospect; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow space-y-1.5 group"
        >
            <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-medium leading-tight">{prospect.name}</p>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {prospect.company && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{prospect.company}
                </p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-xs py-0">{SOURCE_LABELS[prospect.source]}</Badge>
                {prospect.service_interest && (
                    <Badge variant="outline" className="text-xs py-0">{prospect.service_interest}</Badge>
                )}
            </div>
            {prospect.next_followup_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(prospect.next_followup_at), "dd MMM", { locale: es })}
                </p>
            )}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProspectosPage() {
    const { data, isLoading, mutate } = useSWR<{ prospects: Prospect[]; total: number }>(
        "/api/v1/crm/prospects",
        fetcher
    );

    const [view, setView] = useState<"kanban" | "tabla">("kanban");
    const [search, setSearch] = useState("");
    const [filterSource, setFilterSource] = useState<string>("all");
    const [createOpen, setCreateOpen] = useState(false);
    const [editProspect, setEditProspect] = useState<Prospect | null>(null);
    const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);

    const prospects = data?.prospects ?? [];

    const filtered = useMemo(() => {
        return prospects.filter((p) => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                p.name.toLowerCase().includes(q) ||
                p.company?.toLowerCase().includes(q) ||
                p.phone?.includes(q) ||
                p.email?.toLowerCase().includes(q) ||
                p.service_interest?.toLowerCase().includes(q);
            const matchSource = filterSource === "all" || p.source === filterSource;
            return matchSearch && matchSource;
        });
    }, [prospects, search, filterSource]);

    const byStatus = useMemo(() => {
        const map: Record<ProspectStatus, Prospect[]> = {
            nuevo: [], contactado: [], calificado: [], cotizado: [], inscrito: [], perdido: [],
        };
        for (const p of filtered) map[p.status].push(p);
        return map;
    }, [filtered]);

    // Stats
    const stats = useMemo(() => ({
        total: prospects.length,
        activos: prospects.filter((p) => !["inscrito", "perdido"].includes(p.status)).length,
        inscritos: prospects.filter((p) => p.status === "inscrito").length,
        perdidos: prospects.filter((p) => p.status === "perdido").length,
    }), [prospects]);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este prospecto y toda su actividad?")) return;
        const res = await fetch(`/api/v1/crm/prospects/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Prospecto eliminado");
            setDetailProspect(null);
            mutate();
        } else {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="flex h-full gap-0">
            {/* ── Main panel ── */}
            <div className={`flex-1 flex flex-col gap-4 p-6 min-w-0 transition-all ${detailProspect ? "mr-[360px]" : ""}`}>

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <UserSearch className="h-5 w-5 text-muted-foreground" />
                        <h1 className="text-xl font-semibold">Prospectos</h1>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />Nuevo prospecto
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total", value: stats.total },
                        { label: "En pipeline", value: stats.activos },
                        { label: "Inscritos", value: stats.inscritos },
                        { label: "Perdidos", value: stats.perdidos },
                    ].map(({ label, value }) => (
                        <Card key={label} className="p-4">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-2xl font-bold mt-1">{value}</p>
                        </Card>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Buscar por nombre, empresa, servicio..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={filterSource} onValueChange={setFilterSource}>
                        <SelectTrigger className="w-36">
                            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <SelectValue placeholder="Origen" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los orígenes</SelectItem>
                            {(Object.keys(SOURCE_LABELS) as ProspectSource[]).map((s) => (
                                <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex border rounded-md overflow-hidden">
                        <button
                            onClick={() => setView("kanban")}
                            className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                        >
                            <Kanban className="h-4 w-4" />Kanban
                        </button>
                        <button
                            onClick={() => setView("tabla")}
                            className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${view === "tabla" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                        >
                            <LayoutList className="h-4 w-4" />Lista
                        </button>
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* ── KANBAN VIEW ── */}
                {!isLoading && view === "kanban" && (
                    <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
                        {STATUS_PIPELINE.map((status) => {
                            const cards = byStatus[status];
                            return (
                                <div key={status} className={`flex-shrink-0 w-64 rounded-lg border flex flex-col ${STATUS_COLUMN_BG[status]}`}>
                                    <div className="flex items-center justify-between px-3 py-2.5 border-b">
                                        <span className="text-sm font-medium">{STATUS_LABELS[status]}</span>
                                        <span className="text-xs text-muted-foreground bg-background rounded-full px-1.5 py-0.5 border">
                                            {cards.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {cards.map((p) => (
                                            <KanbanCard
                                                key={p.id}
                                                prospect={p}
                                                onClick={() => setDetailProspect(p)}
                                            />
                                        ))}
                                        {cards.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-6">Sin prospectos</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── TABLE VIEW ── */}
                {!isLoading && view === "tabla" && (
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead>Estatus</TableHead>
                                    <TableHead>Origen</TableHead>
                                    <TableHead>Servicio</TableHead>
                                    <TableHead>Seguimiento</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            No hay prospectos que coincidan con la búsqueda
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filtered.map((p) => (
                                    <TableRow
                                        key={p.id}
                                        className="cursor-pointer hover:bg-muted/40"
                                        onClick={() => setDetailProspect(p)}
                                    >
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-sm">{p.name}</p>
                                                {p.phone && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />{p.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{p.company ?? "—"}</TableCell>
                                        <TableCell><StatusBadge status={p.status} /></TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">{SOURCE_LABELS[p.source]}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{p.service_interest ?? "—"}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {p.next_followup_at
                                                ? format(new Date(p.next_followup_at), "dd MMM yyyy", { locale: es })
                                                : "—"
                                            }
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setDetailProspect(p)}>
                                                        Ver detalle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setEditProspect(p); setDetailProspect(null); }}>
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(p.id)}
                                                    >
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* ── Detail panel (slide-in from right) ── */}
            {detailProspect && (
                <div className="fixed right-0 top-0 h-full w-[360px] bg-background border-l shadow-xl z-40 flex flex-col p-4 overflow-hidden">
                    <ProspectDetail
                        prospect={detailProspect}
                        onClose={() => setDetailProspect(null)}
                        onEdit={() => { setEditProspect(detailProspect); setDetailProspect(null); }}
                        onDelete={() => handleDelete(detailProspect.id)}
                        onActivitySaved={() => mutate()}
                    />
                </div>
            )}

            {/* ── Dialogs ── */}
            <ProspectFormDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSaved={() => mutate()}
            />
            <ProspectFormDialog
                open={!!editProspect}
                prospect={editProspect}
                onClose={() => setEditProspect(null)}
                onSaved={() => { mutate(); if (detailProspect) setDetailProspect(null); }}
            />
        </div>
    );
}
