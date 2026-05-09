"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { SessionCalendarMonthView } from "@/components/dashboard/session-calendar-month";

export default function CalendarioSesionesPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/v1/events?limit=100");
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setEvents(data.events ?? []);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[40vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <CalendarIcon className="h-8 w-8 text-primary" />
                    Calendario de sesiones
                </h2>
                <p className="text-muted-foreground mt-1 text-lg">Sesiones publicadas por fecha.</p>
            </div>

            <SessionCalendarMonthView
                events={events}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
            />
        </div>
    );
}
