"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  FileText,
  Clock,
  Search,
  CheckCircle2,
  Trash2,
  Loader2,
  Inbox,
  Filter,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import AddActivityDialog from "./add-activity-dialog";

type CrmActivity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  crm_contacts?: { name: string; type: string } | null;
  crm_opportunities?: { title: string } | null;
};

type ActivitiesResponse = {
  activities: CrmActivity[];
  total: number;
  limit: number;
  offset: number;
};

const ACTIVITY_ICONS: Record<string, { icon: typeof Phone; color: string }> = {
  call: { icon: Phone, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  email: { icon: Mail, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  meeting: { icon: Calendar, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  task: { icon: CheckSquare, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  whatsapp: { icon: MessageCircle, color: "text-green-500 bg-green-500/10 border-green-500/20" },
  note: { icon: FileText, color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
};

const TYPE_LABELS: Record<string, string> = {
  call: "Llamada",
  email: "Correo",
  meeting: "Reunión",
  task: "Tarea",
  whatsapp: "WhatsApp",
  note: "Nota",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  done: "Hecha",
  cancelled: "Cancelada",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  done: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  cancelled: "border-muted-foreground/30 text-muted-foreground bg-muted/30",
};

function buildActivitiesUrl(type: string, status: string, q: string) {
  const p = new URLSearchParams();
  p.set("limit", "50");
  p.set("offset", "0");
  if (type) p.set("type", type);
  if (status) p.set("status", status);
  if (q) p.set("q", q);
  return `/api/v1/crm/activities?${p.toString()}`;
}

function revalidateActivitiesLists() {
  mutate(
    (key) => typeof key === "string" && key.startsWith("/api/v1/crm/activities"),
    undefined,
    { revalidate: true }
  );
}

export default function CrmActivities() {
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmActivity | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const activitiesKey = useMemo(
    () => buildActivitiesUrl(filterType, filterStatus, debouncedQ),
    [filterType, filterStatus, debouncedQ]
  );

  const { data, error, isLoading } = useSWR<ActivitiesResponse>(activitiesKey);
  const activities = data?.activities ?? [];
  const total = data?.total ?? 0;
  const hasActiveFilters = Boolean(filterType || filterStatus || debouncedQ);

  const handleComplete = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/v1/crm/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo completar la actividad.");
      }
      toast.success("Actividad marcada como hecha.");
      revalidateActivitiesLists();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/v1/crm/activities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo eliminar la actividad.");
      }
      toast.success("Actividad eliminada.");
      setDeleteTarget(null);
      revalidateActivitiesLists();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/5 bg-background/60 backdrop-blur-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-outfit text-indigo-400">Actividades</CardTitle>
              <CardDescription>
                Seguimiento de llamadas, correos, reuniones y tareas.
              </CardDescription>
            </div>
            <AddActivityDialog />
          </div>

          <div className="flex flex-col gap-3 pt-2 border-t border-indigo-500/10 mt-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Filter className="h-3.5 w-3.5" />
              Filtros
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar por asunto o descripción…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 border-indigo-500/20 focus-visible:ring-indigo-500/30 bg-background/80"
                />
              </div>
              <Select value={filterType || "__all"} onValueChange={(v) => setFilterType(v === "__all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-[160px] border-indigo-500/20 focus:ring-indigo-500/30 bg-background/80">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos los tipos</SelectItem>
                  <SelectItem value="call">Llamada</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Correo</SelectItem>
                  <SelectItem value="meeting">Reunión</SelectItem>
                  <SelectItem value="task">Tarea</SelectItem>
                  <SelectItem value="note">Nota</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus || "__all"} onValueChange={(v) => setFilterStatus(v === "__all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-[160px] border-indigo-500/20 focus:ring-indigo-500/30 bg-background/80">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="done">Hecha</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isLoading && total > 0 && (
              <p className="text-xs text-muted-foreground">
                {activities.length === total
                  ? `${total} actividad${total === 1 ? "" : "es"}`
                  : `Mostrando ${activities.length} de ${total}`}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-indigo-500/15 before:to-transparent">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative flex items-center md:odd:flex-row-reverse group">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0 z-10 bg-muted/50" />
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-4 md:ml-0 space-y-2 p-4 rounded-xl border border-indigo-500/10 bg-muted/20">
                    <Skeleton className="h-4 w-[62%] max-w-full rounded-md bg-muted/50" />
                    <Skeleton className="h-3 w-full rounded-md bg-muted/40" />
                    <Skeleton className="h-3 w-[40%] max-w-full rounded-md bg-muted/40" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 bg-red-500/5 rounded-xl border border-red-500/10">
              Error al cargar las actividades.
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-indigo-500/20 flex flex-col items-center gap-4 transition-colors hover:border-indigo-500/30">
              {hasActiveFilters ? (
                <>
                  <Inbox className="h-12 w-12 text-indigo-500/35" />
                  <div>
                    <p className="font-medium text-foreground">Sin resultados</p>
                    <p className="text-sm mt-1">Prueba otros filtros o limpia la búsqueda.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-indigo-500/20"
                    onClick={() => {
                      setFilterType("");
                      setFilterStatus("");
                      setSearchInput("");
                      setDebouncedQ("");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </>
              ) : (
                <>
                  <Clock className="h-10 w-10 text-indigo-500/40" />
                  <p>No hay actividades registradas.</p>
                  <p className="text-sm max-w-sm">Crea la primera con &quot;Nueva Actividad&quot; para empezar el seguimiento.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-indigo-500/20 before:to-transparent">
              {activities.map((activity) => {
                const conf = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.note;
                const Icon = conf.icon;
                const typeLabel = TYPE_LABELS[activity.type] ?? activity.type;
                const statusLabel = STATUS_LABELS[activity.status] ?? activity.status;
                const statusClass = STATUS_BADGE[activity.status] ?? STATUS_BADGE.pending;
                const isDone = activity.status === "done";
                const busy = actionLoadingId === activity.id;

                return (
                  <div
                    key={activity.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 transition-transform duration-300 group-hover:scale-105">
                      <div className={`p-2 rounded-full ${conf.color} ${isDone ? "opacity-70" : ""}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div
                      className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-500/10 bg-card/50 shadow-sm hover:shadow-md hover:border-indigo-500/25 transition-all duration-300 ${isDone ? "opacity-90" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span
                          className={`text-sm font-semibold text-foreground leading-snug ${isDone ? "line-through decoration-muted-foreground/50" : ""}`}
                        >
                          {activity.subject}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          <Badge variant="outline" className={`text-[10px] ${conf.color} border`}>
                            {typeLabel}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] border ${statusClass}`}>
                            {statusLabel}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {activity.crm_contacts?.name}{" "}
                        {activity.crm_opportunities ? ` • ${activity.crm_opportunities.title}` : ""}
                      </div>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{activity.description}</p>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-indigo-500/10">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 shrink-0" />
                          {activity.due_date
                            ? format(new Date(activity.due_date), "PP p", { locale: es })
                            : format(new Date(activity.created_at), "PP p", { locale: es })}
                        </div>
                        <div className="flex items-center gap-1">
                          {activity.status === "pending" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              title="Marcar como hecha"
                              className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              onClick={() => handleComplete(activity.id)}
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            title="Eliminar"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(activity)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-indigo-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente
              {deleteTarget ? (
                <>
                  : <span className="font-medium text-foreground"> {deleteTarget.subject}</span>
                </>
              ) : null}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoadingId === deleteTarget?.id}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteTarget || actionLoadingId === deleteTarget.id}
              className="gap-2"
              onClick={() => void handleDeleteConfirm()}
            >
              {actionLoadingId === deleteTarget?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
