import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarIcon, Clock, MapPin } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { portalApiGet } from "@/lib/portal/server-fetch";

type PortalHorariosSlot = {
    id: string;
    event_id: string;
    session_id: string | null;
    start_time: string;
    end_time: string;
    status: string | null;
    exam_type: string | null;
    event_date: string | null;
    event_title: string;
    school_name: string;
};

type HorariosResponse = { slots: PortalHorariosSlot[]; total: number };

function parseEventDate(value: string | null): Date | null {
    if (!value) return null;
    const d = parseISO(value.length <= 10 ? `${value}T12:00:00` : value);
    return isValid(d) ? d : null;
}

export default async function PortalSchedulePage() {
    const res = await portalApiGet<HorariosResponse>("/api/v1/portal/horarios");

    if (!res.ok) {
        if (res.status === 401) {
            return (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    Debes iniciar sesión para ver tus horarios.
                </div>
            );
        }
        if (res.status === 403) {
            return (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    Tu usuario no está vinculado a un aplicador.
                </div>
            );
        }
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                No se pudieron cargar los horarios: {res.message}
            </div>
        );
    }

    const slots = res.data.slots ?? [];

    const enrichedSlots = slots.map((slot) => ({
        ...slot,
        exam_name: slot.exam_type ?? "Desconocido",
        event: {
            id: slot.event_id,
            event_date: slot.event_date,
            school_name: slot.school_name,
            venue_notes: slot.event_title,
        },
    }));

    enrichedSlots.sort((a, b) => {
        const aDate = a.event?.event_date || "";
        const bDate = b.event?.event_date || "";
        return aDate.localeCompare(bDate) || String(a.start_time).localeCompare(String(b.start_time));
    });

    const groupedByEvent = enrichedSlots.reduce(
        (groups, slot) => {
            if (!slot.event?.id) return groups;
            const key = slot.event.id;
            if (!groups[key]) {
                groups[key] = { event: slot.event, slots: [] as typeof enrichedSlots };
            }
            groups[key].slots.push(slot);
            return groups;
        },
        {} as Record<string, { event: (typeof enrichedSlots)[0]["event"]; slots: typeof enrichedSlots }>
    );

    const sortedGroups = Object.values(groupedByEvent).sort((a, b) =>
        String(a.event.event_date || "").localeCompare(String(b.event.event_date || ""))
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Horarios Asignados</h1>
                <p className="text-muted-foreground">
                    Consulta tus próximos turnos de aplicación por evento.
                </p>
            </div>

            {sortedGroups.length === 0 ? (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    No tienes turnos programados.
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedGroups.map((group) => {
                        const eventDate = parseEventDate(group.event.event_date);

                        return (
                            <Card key={group.event.id}>
                                <CardHeader className="bg-muted/30">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                <CalendarIcon className="h-5 w-5 text-primary" />
                                                {eventDate
                                                    ? format(eventDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                                                    : "Fecha por definir"}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2 text-sm">
                                                <MapPin className="h-4 w-4" />
                                                <span className="font-medium text-foreground">{group.event.school_name}</span>
                                                {group.event.venue_notes && (
                                                    <span className="text-muted-foreground">- {group.event.venue_notes}</span>
                                                )}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="h-fit">
                                            {group.slots.length} turno(s)
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[120px]">Horario</TableHead>
                                                <TableHead>Examen</TableHead>
                                                <TableHead>Salón</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.slots.map((slot) => (
                                                <TableRow key={slot.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                            {slot.start_time} - {slot.end_time}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{slot.exam_name}</TableCell>
                                                    <TableCell>Por asignar</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
