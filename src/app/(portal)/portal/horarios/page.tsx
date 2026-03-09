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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    mockSlots,
    mockEvents,
    mockEventExams,
} from "@/lib/demo/data";

const APPLICATOR_ID = "applicator-001"; // Hardcoded for demo

export default function PortalSchedulePage() {
    // 1. Get my slots
    const mySlots = mockSlots.filter((s) => s.applicator_id === APPLICATOR_ID);

    // 2. Enrich with Event and Exam Data
    const enrichedSlots = mySlots.map((slot) => {
        const eventExam = mockEventExams.find((ee) => ee.id === slot.event_exam_id);
        const event = mockEvents.find((e) => e.id === eventExam?.event_id);
        return {
            ...slot,
            event,
            exam_name: eventExam?.exam_name || "Desconocido",
        };
    });

    // 3. Sort by date and time
    enrichedSlots.sort((a, b) => {
        const aDate = a.event?.event_date || "";
        const bDate = b.event?.event_date || "";
        return aDate.localeCompare(bDate) || a.start_time.localeCompare(b.start_time);
    });

    // 4. Group by event_id (or event_date + school for better grouping if multiple per day)
    const groupedByEvent = enrichedSlots.reduce((groups, slot) => {
        if (!slot.event) return groups;
        const key = slot.event.id;
        if (!groups[key]) {
            groups[key] = {
                event: slot.event,
                slots: [],
            };
        }
        groups[key].slots.push(slot);
        return groups;
    }, {} as Record<string, { event: NonNullable<typeof enrichedSlots[0]["event"]>, slots: typeof enrichedSlots }>);

    const sortedGroups = Object.values(groupedByEvent).sort((a, b) =>
        a.event.event_date.localeCompare(b.event.event_date)
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
                        const eventDate = new Date(group.event.event_date);

                        return (
                            <Card key={group.event.id}>
                                <CardHeader className="bg-muted/30">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                <CalendarIcon className="h-5 w-5 text-primary" />
                                                {format(eventDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
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
                                                    <TableCell>{slot.room_name || "Por asignar"}</TableCell>
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
