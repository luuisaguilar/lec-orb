"use client";

import { use, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    CalendarDays,
    MapPin,
    Users,
    Clock,
    UserCircle,
    Loader2,
    ChevronLeft,
    Plus,
    Trash2,
    Edit2,
    DollarSign,
    Briefcase,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventStaffManager } from "./components/event-staff-manager";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// FinancialsView component (Internal for now)
function FinancialsView({ eventId }: { eventId: string }) {
    const { data, isLoading } = useSWR(`/api/v1/events/${eventId}/financials`, fetcher);
    
    if (isLoading) return (
        <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );

    const { summary, breakdown } = data || { summary: { totalStaffCost: 0, estimatedIncome: 0, netProfit: 0, staffCount: 0 }, breakdown: [] };

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-background to-muted/50">
            <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                        <DollarSign className="h-5 w-5" />
                    </div>
                    Análisis de Rentabilidad (P&L)
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative group overflow-hidden p-6 rounded-2xl bg-white dark:bg-zinc-900 border shadow-sm transition-all hover:shadow-md">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Plus className="h-12 w-12 text-green-600" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Ingresos Estimados</p>
                        <p className="text-3xl font-black text-green-600 dark:text-green-400">
                            ${summary.estimatedIncome.toLocaleString("es-MX")}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded-full">
                            <Briefcase className="h-3 w-3" />
                            Facturación IH Billing
                        </div>
                    </div>

                    <div className="relative group overflow-hidden p-6 rounded-2xl bg-white dark:bg-zinc-900 border shadow-sm transition-all hover:shadow-md">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Users className="h-12 w-12 text-red-600" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Costos de Staff</p>
                        <p className="text-3xl font-black text-red-600 dark:text-red-400">
                            ${summary.totalStaffCost.toLocaleString("es-MX")}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded-full">
                            <UserCircle className="h-3 w-3" />
                            {summary.staffCount} aplicadores pagados
                        </div>
                    </div>

                    <div className={cn(
                        "relative group overflow-hidden p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md",
                        summary.netProfit >= 0 
                            ? "bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20" 
                            : "bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20"
                    )}>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <DollarSign className="h-12 w-12 text-blue-600" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Utilidad Neta</p>
                        <p className={cn(
                            "text-3xl font-black",
                            summary.netProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                            ${summary.netProfit.toLocaleString("es-MX")}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded-full">
                            <Clock className="h-3 w-3" />
                            Margen operativo actual
                        </div>
                    </div>
                </div>

                {breakdown.length > 0 ? (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-muted-foreground px-1">Desglose de Gastos de Nómina</h4>
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-medium">Concepto / Rol</th>
                                        <th className="text-right py-3 px-4 font-medium">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {breakdown.map((item: any, i: number) => (
                                        <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                                                        {item.role || 'STAFF'}
                                                    </Badge>
                                                    <span className="text-muted-foreground">Pago por servicios de aplicación</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-medium">
                                                ${Number(item.total_amount).toLocaleString("es-MX")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-muted/20 font-bold border-t">
                                    <tr>
                                        <td className="py-3 px-4 text-muted-foreground uppercase text-xs tracking-widest">Total Staff</td>
                                        <td className="py-3 px-4 text-right text-red-600">
                                            ${summary.totalStaffCost.toLocaleString("es-MX")}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-muted/10">
                        <Briefcase className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-muted-foreground">Sin registros financieros</h4>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                            Calcula la nómina del periodo correspondiente para ver el desglose de costos de este evento.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const slotStatusColors: Record<string, string> = {
    open: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    assigned: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

interface Slot {
    id: string;
    slot_number: number;
    start_time: string;
    end_time: string;
    applicator_id: string | null;
    applicator_name: string | null;
    room_name: string | null;
    status: string;
}

interface EventExam {
    id: string;
    exam_name: string;
    exam_code: string | null;
    duration_minutes: number;
    students_per_session: number;
    total_students: number;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
    slots: Slot[];
}

interface EventDetail {
    id: string;
    name: string;
    event_date: string;
    school_name: string | null;
    venue_notes: string | null;
    status: string;
    notes: string | null;
}

export default function EventDetailPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = use(params);
    const { t } = useI18n();
    const { data, isLoading } = useSWR(
        `/api/v1/events/${eventId}`,
        fetcher
    );

    const event: EventDetail | undefined = data?.event;
    const exams: EventExam[] = data?.exams || [];

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="space-y-4">
                <Link href="/dashboard/eventos">
                    <Button variant="ghost" size="sm">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        {t("events.title")}
                    </Button>
                </Link>
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        Evento no encontrado
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalStudents = exams.reduce(
        (sum, ee) => sum + ee.total_students,
        0
    );
    const totalSlots = exams.reduce(
        (sum, ee) => sum + ee.slots.length,
        0
    );
    const assignedSlots = exams.reduce(
        (sum, ee) =>
            sum + ee.slots.filter((s) => s.status === "assigned").length,
        0
    );

    return (
        <div className="space-y-6">
            {/* Back button + header */}
            <div className="space-y-2">
                <Link href="/dashboard/eventos">
                    <Button variant="ghost" size="sm">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        {t("events.title")}
                    </Button>
                </Link>
                <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">{event.name}</h2>
                    <Badge
                        className={statusColors[event.status] || statusColors.draft}
                    >
                        {t(
                            `events.status.${event.status}` as Parameters<typeof t>[0]
                        )}
                    </Badge>
                </div>
            </div>

            {/* Event summary cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <CalendarDays className="h-4 w-4" />
                            {t("events.date")}
                        </div>
                        <p className="font-semibold">
                            {new Date(event.event_date + "T12:00:00").toLocaleDateString("es-MX", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </CardContent>
                </Card>

                {event.school_name && (
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <MapPin className="h-4 w-4" />
                                {t("events.school")}
                            </div>
                            <p className="font-semibold">{event.school_name}</p>
                            {event.venue_notes && (
                                <p className="text-xs text-muted-foreground">
                                    {event.venue_notes}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Users className="h-4 w-4" />
                            {t("events.totalStudents")}
                        </div>
                        <p className="text-2xl font-bold">{totalStudents}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Clock className="h-4 w-4" />
                            {t("events.slots")}
                        </div>
                        <p className="text-xl font-bold">
                            <span className="text-green-600">{assignedSlots}</span>
                            <span className="text-muted-foreground font-normal">
                                {" "}
                                / {totalSlots}
                            </span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs Navigation */}
            <Tabs defaultValue="planning" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="planning" className="gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Planificación
                    </TabsTrigger>
                    <TabsTrigger value="logistics" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Staff & Logística
                    </TabsTrigger>
                    <TabsTrigger value="financials" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Finanzas & P&L
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="planning" className="space-y-6 pt-4">
                    {/* Exams with slots */}
                    {exams.map((exam) => {
                        const examAssigned = exam.slots.filter(
                            (s) => s.status === "assigned"
                        ).length;
                        return (
                            <Card key={exam.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            {exam.exam_code && (
                                                <Badge variant="outline" className="font-mono">
                                                    {exam.exam_code}
                                                </Badge>
                                            )}
                                            {exam.exam_name}
                                        </CardTitle>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span>{exam.total_students} alumnos</span>
                                            <span>•</span>
                                            <span>{exam.duration_minutes} min/sesión</span>
                                            {exam.start_time && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {exam.start_time} – {exam.end_time}
                                                    </span>
                                                </>
                                            )}
                                            <Badge
                                                className={
                                                    examAssigned === exam.slots.length
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-amber-100 text-amber-700"
                                                }
                                            >
                                                {examAssigned}/{exam.slots.length} {t("events.assigned")}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {exam.slots.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">
                                            Sin turnos generados
                                        </p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/50">
                                                        <th className="px-3 py-2 text-left font-medium w-16">
                                                            #
                                                        </th>
                                                        <th className="px-3 py-2 text-left font-medium">
                                                            {t("common.time")}
                                                        </th>
                                                        <th className="px-3 py-2 text-left font-medium">
                                                            Aplicador
                                                        </th>
                                                        <th className="px-3 py-2 text-left font-medium">
                                                            Salón
                                                        </th>
                                                        <th className="px-3 py-2 text-center font-medium">
                                                            {t("common.status")}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {exam.slots.map((slot) => (
                                                        <tr
                                                            key={slot.id}
                                                            className="border-b transition-colors hover:bg-muted/50"
                                                        >
                                                            <td className="px-3 py-2 text-muted-foreground">
                                                                {slot.slot_number}
                                                            </td>
                                                            <td className="px-3 py-2 font-mono text-xs">
                                                                {slot.start_time} – {slot.end_time}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                {slot.applicator_name ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <UserCircle className="h-4 w-4 text-violet-500" />
                                                                        {slot.applicator_name}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground italic">
                                                                        Sin asignar
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                {slot.room_name || "—"}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <Badge
                                                                    className={
                                                                        slotStatusColors[slot.status] ||
                                                                        slotStatusColors.open
                                                                    }
                                                                >
                                                                    {t(
                                                                        `events.slot.${slot.status}` as Parameters<
                                                                            typeof t
                                                                        >[0]
                                                                    )}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}

                    {event.notes && (
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Notas:</strong> {event.notes}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="logistics" className="pt-4">
                    <EventStaffManager eventId={eventId} />
                </TabsContent>

                <TabsContent value="financials" className="pt-4">
                    <FinancialsView eventId={eventId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
