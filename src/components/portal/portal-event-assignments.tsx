"use client";

import { useCallback, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ClipboardList, Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type PortalAckStatus = "pending" | "accepted" | "declined";

export type PortalEventAssignment = {
    id: string;
    event_id: string;
    session_id: string | null;
    role: string;
    hourly_rate: number | null;
    fixed_payment: number | null;
    notes: string | null;
    acknowledgment_status: PortalAckStatus;
    acknowledged_at: string | null;
    created_at: string | null;
    event: {
        id: string;
        title: string | null;
        date: string | null;
        status: string | null;
        schools: { id: string; name: string | null; city: string | null } | null;
    } | null;
    session: {
        id: string;
        exam_type: string | null;
        date: string | null;
        speaking_date: string | null;
    } | null;
};

type Props = {
    assignments: PortalEventAssignment[];
};

function parseDate(value: string | null): Date | null {
    if (!value) return null;
    const d = parseISO(value.length <= 10 ? `${value}T12:00:00` : value);
    return isValid(d) ? d : null;
}

function AckBadge({ status }: { status: PortalAckStatus }) {
    switch (status) {
        case "accepted":
            return (
                <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400 border border-emerald-600/25">
                    Confirmado
                </Badge>
            );
        case "declined":
            return (
                <Badge variant="destructive" className="font-normal">
                    Rechazado
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400">
                    Pendiente de confirmación
                </Badge>
            );
    }
}

export function PortalEventAssignments({ assignments: initial }: Props) {
    const [rows, setRows] = useState(initial);
    const [busyId, setBusyId] = useState<string | null>(null);

    const act = useCallback(async (staffId: string, action: "accept" | "decline") => {
        setBusyId(staffId);
        try {
            const res = await fetch(`/api/v1/portal/event-assignments/${staffId}/ack`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(typeof body?.error === "string" ? body.error : "No se pudo actualizar.");
            }
            const nextStatus = (body?.acknowledgment_status as PortalAckStatus) ?? (action === "accept" ? "accepted" : "declined");
            setRows((prev) =>
                prev.map((r) =>
                    r.id === staffId
                        ? {
                              ...r,
                              acknowledgment_status: nextStatus,
                              acknowledged_at: new Date().toISOString(),
                          }
                        : r
                )
            );
            toast.success(action === "accept" ? "Asignación aceptada." : "Asignación rechazada.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error de red");
        } finally {
            setBusyId(null);
        }
    }, []);

    if (rows.length === 0) {
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                No tienes asignaciones a eventos en este momento.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {rows.map((row) => {
                const ev = row.event;
                const schoolName = ev?.schools?.name ?? "Centro por definir";
                const eventDate = parseDate(ev?.date ?? null);
                const sessionDate = parseDate(row.session?.date ?? null);
                const pending = row.acknowledgment_status === "pending";

                return (
                    <Card key={row.id}>
                        <CardHeader className="bg-muted/30">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                                        {ev?.title?.trim() || "Evento"}
                                    </CardTitle>
                                    <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarIcon className="h-4 w-4" />
                                            {eventDate
                                                ? format(eventDate, "EEEE d MMM yyyy", { locale: es })
                                                : "Fecha por definir"}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            <span className="font-medium text-foreground">{schoolName}</span>
                                        </span>
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <AckBadge status={row.acknowledgment_status} />
                                    <Badge variant="secondary" className="text-[10px] uppercase">
                                        {row.role}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {row.session && (
                                <div className="rounded-lg border bg-background/50 px-3 py-2 text-sm">
                                    <p className="font-medium text-foreground">
                                        Sesión: {row.session.exam_type ?? "Examen"}
                                    </p>
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                        {sessionDate
                                            ? `Escrito: ${format(sessionDate, "d MMM yyyy", { locale: es })}`
                                            : "Fecha de sesión por definir"}
                                        {row.session.speaking_date
                                            ? ` · Speaking: ${row.session.speaking_date}`
                                            : ""}
                                    </p>
                                </div>
                            )}
                            {row.notes && (
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">Notas: </span>
                                    {row.notes}
                                </p>
                            )}
                            {pending && (
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        className="gap-1"
                                        disabled={busyId === row.id}
                                        onClick={() => act(row.id, "accept")}
                                    >
                                        {busyId === row.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Aceptar"
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1"
                                        disabled={busyId === row.id}
                                        onClick={() => act(row.id, "decline")}
                                    >
                                        Rechazar
                                    </Button>
                                </div>
                            )}
                            {!pending && row.acknowledged_at && (
                                <p className={cn("text-xs text-muted-foreground")}>
                                    Actualizado:{" "}
                                    {format(parseISO(row.acknowledged_at), "d MMM yyyy HH:mm", { locale: es })}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
