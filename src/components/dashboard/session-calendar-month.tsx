"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    startOfWeek,
    endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXAM_COLORS: Record<string, string> = {
    starters: "bg-yellow-400/90 text-yellow-950",
    movers: "bg-orange-400/90 text-orange-950",
    flyers: "bg-amber-500/90 text-amber-950",
    ket: "bg-blue-500/90 text-white",
    pet: "bg-violet-500/90 text-white",
    fce: "bg-rose-500/90 text-white",
};

function examColor(t: string | undefined | null) {
    if (!t) return "bg-primary/80 text-primary-foreground";
    return EXAM_COLORS[t.toLowerCase()] ?? "bg-primary/80 text-primary-foreground";
}

export function SessionCalendarMonthView({
    events,
    currentMonth,
    onMonthChange,
}: {
    events: any[];
    currentMonth: Date;
    onMonthChange: (d: Date) => void;
}) {
    const router = useRouter();
    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
    });

    const dayMap = useMemo(() => {
        const map: Record<string, { event: any; session: any; isSpeaking: boolean }[]> = {};
        events.forEach((ev) => {
            (ev.event_sessions || ev.sessions || []).forEach((s: any) => {
                if (s.date) {
                    (map[s.date] ??= []).push({ event: ev, session: s, isSpeaking: false });
                }
                if (s.speaking_date && s.speaking_date !== s.date) {
                    (map[s.speaking_date] ??= []).push({ event: ev, session: s, isSpeaking: true });
                }
            });
        });
        return map;
    }, [events]);

    const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    return (
        <div className="rounded-xl border bg-background overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
                <Button variant="outline" size="icon" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold capitalize">{format(currentMonth, "MMMM yyyy", { locale: es })}</h3>
                </div>
                <Button variant="outline" size="icon" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-7 border-b bg-muted/10">
                {WEEKDAYS.map((d) => (
                    <div
                        key={d}
                        className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const entries = dayMap[key] || [];
                    const inMonth = isSameMonth(day, currentMonth);
                    return (
                        <div
                            key={key}
                            className={cn(
                                "min-h-[100px] p-2 border-r border-b transition-colors",
                                !inMonth && "bg-muted/30 opacity-60",
                                isToday(day) && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                            )}
                        >
                            <div
                                className={cn(
                                    "w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-2 ml-auto",
                                    isToday(day)
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : inMonth
                                          ? "text-foreground"
                                          : "text-muted-foreground"
                                )}
                            >
                                {format(day, "d")}
                            </div>
                            <div className="space-y-1 overflow-hidden">
                                {entries.slice(0, 3).map((e, i) => (
                                    <button
                                        key={i}
                                        onClick={() => router.push(`/dashboard/eventos/planner/${e.event.id}`)}
                                        className={cn(
                                            "w-full text-left text-[11px] font-semibold px-2 py-1 rounded truncate transition-opacity hover:opacity-80 shadow-sm",
                                            examColor(e.session.exam_type),
                                            e.isSpeaking && "ring-2 ring-emerald-500 border-emerald-400 border"
                                        )}
                                    >
                                        {e.isSpeaking ? "🎤 " : "📝 "}
                                        {e.session.exam_type || "Examen"} - {e.event.school?.name || "Sede"}
                                    </button>
                                ))}
                                {entries.length > 3 && (
                                    <div className="text-[10px] text-muted-foreground text-center font-medium pt-1">
                                        + {entries.length - 3} más
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
