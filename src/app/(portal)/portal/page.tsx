import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    mockApplicators,
    mockSlots,
    mockEvents,
    mockEventExams,
    mockPayrollEntries,
} from "@/lib/demo/data";

const APPLICATOR_ID = "applicator-001"; // Hardcoded for demo

export default function PortalPage() {
    const applicator = mockApplicators.find((a) => a.id === APPLICATOR_ID);
    
    // Derived Data
    // Next 3 slots
    const mySlots = mockSlots.filter((s) => s.applicator_id === APPLICATOR_ID);
    const enrichedSlots = mySlots.map((slot) => {
        const eventExam = mockEventExams.find((ee) => ee.id === slot.event_exam_id);
        const event = mockEvents.find((e) => e.id === eventExam?.event_id);
        return {
            ...slot,
            event,
            exam_name: eventExam?.exam_name || "Desconocido",
        };
    });
    
    // Sort by date/time (mock data uses strings that sort naturally usually, but let's assume future)
    enrichedSlots.sort((a, b) => {
        const aDate = a.event?.event_date || "";
        const bDate = b.event?.event_date || "";
        return aDate.localeCompare(bDate) || a.start_time.localeCompare(b.start_time);
    });

    const upcomingSlots = enrichedSlots.slice(0, 3);
    const nextEvent = upcomingSlots[0];

    // Payroll
    const myPayroll = mockPayrollEntries.filter((p) => p.applicator_id === APPLICATOR_ID);
    const pendingBalance = myPayroll
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + p.total, 0);
    
    const paidPayroll = myPayroll
        .filter((p) => p.status === "paid")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 3);

    const totalSlotsMined = myPayroll.reduce((sum, p) => sum + p.slots_count, 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Hola, {applicator?.name}</h1>
                <p className="text-muted-foreground">
                    Aquí está el resumen de tu actividad y próximos eventos.
                </p>
            </div>

            {/* Dashboard Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Próximo Evento</CardTitle>
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {nextEvent?.event?.event_date
                                ? format(new Date(nextEvent.event.event_date), "d MMM", { locale: es })
                                : "Ninguno"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {nextEvent?.event?.school_name || "Sin próximos turnos"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Balance Pendiente</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${pendingBalance.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Por nómina en curso
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Turnos Completados</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSlotsMined}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Acumulado histórico
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Upcoming Schedule */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Próximos Turnos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingSlots.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No tienes turnos programados.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {upcomingSlots.map((slot) => (
                                    <div key={slot.id} className="flex items-start gap-4 rounded-lg border p-4">
                                        <div className="rounded-full bg-primary/10 p-2 text-primary">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {slot.exam_name} - {slot.room_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {slot.event?.school_name}
                                            </p>
                                            <div className="flex items-center gap-2 pt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {slot.event?.event_date 
                                                        ? format(new Date(slot.event.event_date), "dd MMM yyyy", { locale: es }) 
                                                        : ""}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {slot.start_time} - {slot.end_time}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Payroll */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Pagos Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {paidPayroll.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No hay pagos recientes registrados.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {paidPayroll.map((payroll) => (
                                    <div key={payroll.id} className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                Pago Completado
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {payroll.events_count} evento(s), {payroll.slots_count} turnos
                                            </p>
                                            {payroll.notes && (
                                                <p className="text-xs text-muted-foreground">
                                                    Nota: {payroll.notes}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="font-bold text-green-600 dark:text-green-500">
                                                +${payroll.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] uppercase">
                                                Pagado
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
