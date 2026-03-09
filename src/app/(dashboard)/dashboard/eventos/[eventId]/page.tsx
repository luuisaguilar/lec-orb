"use client";

import { use } from "react";
import useSWR from "swr";
import { useI18n } from "@/lib/i18n";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
        </div>
    );
}
