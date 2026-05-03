import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, DollarSign, Clock, CheckCircle2, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Applicator Portal Dashboard
 * --------------------------
 * Migrated from mock data to real Supabase integration.
 * Fetches data based on the authenticated user's applicator profile.
 */

export default async function PortalPage() {
    const supabase = await createClient();
    
    // 1. Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // 2. Fetch Applicator Profile linked to this user
    const { data: applicator } = await supabase
        .from("applicators")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    // Handling case where user is not yet an applicator
    if (!applicator) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                    <User className="h-12 w-12 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Perfil de Aplicador no encontrado</h1>
                <p className="text-muted-foreground max-w-md mt-2">
                    Tu usuario no está vinculado a un perfil de aplicador. 
                    Si crees que esto es un error, por favor contacta al administrador de tu organización.
                </p>
                <div className="mt-8 p-4 border rounded-lg bg-muted/30 text-xs text-left">
                    <p className="font-semibold mb-1">Información técnica:</p>
                    <p>User ID: {user.id}</p>
                    <p>Email: {user.email}</p>
                </div>
            </div>
        );
    }

    // 3. Fetch Upcoming Slots
    // We join event_exams and events to get dates and names
    const { data: slotsData } = await supabase
        .from("slots")
        .select(`
            id,
            room_name,
            start_time,
            end_time,
            event_exam:event_exams (
                exam_name,
                event:events (
                    name,
                    event_date,
                    school_name
                )
            )
        `)
        .eq("applicator_id", applicator.id)
        .order("id", { ascending: true }); // We'll sort properly in JS due to nested fields

    const today = format(new Date(), "yyyy-MM-dd");

    const enrichedSlots = (slotsData || [])
        .map((slot: any) => ({
            id: slot.id,
            room_name: slot.room_name,
            start_time: slot.start_time,
            end_time: slot.end_time,
            exam_name: slot.event_exam?.exam_name || "Examen",
            school_name: slot.event_exam?.event?.school_name || "Sede",
            event_date: slot.event_exam?.event?.event_date || "",
        }))
        // Filter only upcoming or today
        .filter(s => s.event_date >= today)
        .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time));

    const upcomingSlots = enrichedSlots.slice(0, 3);
    const nextEvent = upcomingSlots[0];

    // 4. Fetch Payroll Summary
    const { data: payrollEntries } = await supabase
        .from("payroll_entries")
        .select("*")
        .eq("applicator_id", applicator.id);

    const pendingBalance = (payrollEntries || [])
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + Number(p.total), 0);
    
    const paidPayroll = (payrollEntries || [])
        .filter((p) => p.status === "paid")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 3);

    const totalSlotsMined = (payrollEntries || []).reduce((sum, p) => sum + (p.slots_count || 0), 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Hola, {applicator.name}</h1>
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
                            {nextEvent?.event_date
                                ? format(parseISO(nextEvent.event_date), "d MMM", { locale: es })
                                : "Ninguno"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {nextEvent?.school_name || "Sin próximos turnos"}
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
                                                {slot.school_name}
                                            </p>
                                            <div className="flex items-center gap-2 pt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {slot.event_date 
                                                        ? format(parseISO(slot.event_date), "dd MMM yyyy", { locale: es }) 
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
                                                +${Number(payroll.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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
