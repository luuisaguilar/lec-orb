"use client";

import { useEffect, useState, useMemo } from "react";

import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    eachDayOfInterval, isSameMonth, isToday,
    startOfWeek, endOfWeek
} from "date-fns";
import { es } from "date-fns/locale";
import {
    Calendar as CalendarIcon, LayoutGrid, Users, MapPin,
    Search, ArrowRight, Trash2, Pencil, UserCheck,
    ChevronLeft, ChevronRight, KanbanSquare
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddEventDialog } from "@/components/events/add-event-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Exam colors for calendar chips ─────────────────────────────────────────
const EXAM_COLORS: Record<string, string> = {
    starters: "bg-yellow-400/90 text-yellow-950",
    movers: "bg-orange-400/90 text-orange-950",
    flyers: "bg-amber-500/90 text-amber-950",
    ket: "bg-blue-500/90 text-white",
    pet: "bg-violet-500/90 text-white",
    fce: "bg-rose-500/90 text-white",
};

function examColor(examType: string) {
    return EXAM_COLORS[examType?.toLowerCase()] ?? "bg-primary/80 text-primary-foreground";
}

// ── Calendar Month View ─────────────────────────────────────────────────────
function CalendarMonthView({ events, currentMonth, onMonthChange }: {
    events: any[];
    currentMonth: Date;
    onMonthChange: (d: Date) => void;
}) {
    const router = useRouter();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    // Build map: date-string → [{event, session, isSpeaking}]
    const dayMap = useMemo(() => {
        const map: Record<string, { event: any; session: any; isSpeaking: boolean }[]> = {};
        events.forEach(event => {
            (event.sessions || []).forEach((session: any) => {
                if (session.date) {
                    if (!map[session.date]) map[session.date] = [];
                    map[session.date].push({ event, session, isSpeaking: false });
                }
                if (session.speaking_date && session.speaking_date !== session.date) {
                    if (!map[session.speaking_date]) map[session.speaking_date] = [];
                    map[session.speaking_date].push({ event, session, isSpeaking: true });
                }
            });
        });
        return map;
    }, [events]);

    const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    return (
        <div className="rounded-xl border bg-background overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-base font-bold capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: es })}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-7 border-b">
                {WEEKDAYS.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {days.map(day => {
                    const key = format(day, "yyyy-MM-dd");
                    const entries = dayMap[key] || [];
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const todayDay = isToday(day);
                    return (
                        <div
                            key={key}
                            className={cn(
                                "min-h-[90px] p-1.5 border-r border-b transition-colors",
                                !isCurrentMonth && "bg-muted/20",
                                todayDay && "bg-primary/5"
                            )}
                        >
                            <div className={cn(
                                "w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ml-auto",
                                todayDay
                                    ? "bg-primary text-primary-foreground"
                                    : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"
                            )}>
                                {format(day, "d")}
                            </div>
                            <div className="space-y-0.5 overflow-hidden">
                                {entries.slice(0, 3).map((entry, i) => (
                                    <button
                                        key={i}
                                        onClick={() => router.push(`/dashboard/eventos/planner/${entry.event.id}`)}
                                        title={`${entry.event.title} — ${entry.session.exam_type.toUpperCase()}${entry.isSpeaking ? ' (Speaking)' : ''}`}
                                        className={cn(
                                            "w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded truncate leading-tight transition-opacity hover:opacity-80",
                                            examColor(entry.session.exam_type),
                                            entry.isSpeaking && "ring-1 ring-emerald-400"
                                        )}
                                    >
                                        {entry.isSpeaking && "🎤 "}{entry.session.exam_type.toUpperCase()} · {entry.event.school?.name?.split(" ")[0]}
                                    </button>
                                ))}
                                {entries.length > 3 && (
                                    <p className="text-[9px] text-muted-foreground pl-1">+{entries.length - 3} más</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Status badge helper ─────────────────────────────────────────────────────
function statusVariant(status: string): "secondary" | "default" | "outline" | "destructive" {
    switch (status) {
        case 'DRAFT': return 'secondary';
        case 'PUBLISHED': return 'default';
        case 'COMPLETED': return 'outline';
        case 'CANCELLED': return 'destructive';
        default: return 'secondary';
    }
}

const KANBAN_STATUSES = [
    { key: 'DRAFT', label: 'Borrador', headerCls: 'bg-gray-100 dark:bg-gray-800 border-gray-400' },
    { key: 'PUBLISHED', label: 'Publicado', headerCls: 'bg-blue-50 dark:bg-blue-950/30 border-blue-500' },
    { key: 'COMPLETED', label: 'Completado', headerCls: 'bg-green-50 dark:bg-green-950/30 border-green-500' },
    { key: 'CANCELLED', label: 'Cancelado', headerCls: 'bg-red-50 dark:bg-red-950/30 border-red-500' },
];

function KanbanEventView({ events, onEdit, onDelete }: {
    events: any[];
    onEdit: (e: any) => void;
    onDelete: (id: string, title: string) => void;
}) {
    const router = useRouter();
    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_STATUSES.map(({ key, label, headerCls }) => {
                const col = events.filter((e) => e.status === key);
                return (
                    <div key={key} className="flex-shrink-0 w-80">
                        <div className={`rounded-xl border-t-4 border bg-card ${headerCls}`}>
                            <div className="px-3 py-2.5 flex items-center justify-between border-b border-inherit">
                                <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                                <Badge variant={statusVariant(key)} className="text-[10px]">{col.length}</Badge>
                            </div>
                            <div className="p-2 space-y-2 min-h-[100px]">
                                {col.map((event) => (
                                    <div key={event.id} className="bg-background rounded-lg border shadow-sm p-3 space-y-2 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-xs leading-tight truncate">{event.title}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{event.school?.name || '—'}</span>
                                                </p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => onEdit(event)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button onClick={() => onDelete(event.id, event.title)} className="p-1 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Exams */}
                                        {event.sessions && event.sessions.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {event.sessions.map((s: any) => (
                                                    <span key={s.id} className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase", examColor(s.exam_type))}>{s.exam_type}</span>
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => router.push(`/dashboard/eventos/planner/${event.id}`)}
                                            className="w-full flex items-center justify-between text-[10px] font-medium text-primary hover:text-primary/80 border rounded px-2 py-1 hover:bg-primary/5 transition-colors"
                                        >
                                            Abrir Planner <ArrowRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                {col.length === 0 && (
                                    <p className="text-[10px] text-center text-muted-foreground py-6">Sin eventos</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function EventosPage() {

    const [events, setEvents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [view, setView] = useState<"list" | "calendar" | "kanban">("list");
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar la planeación: ${title}?`)) return;
        try {
            const res = await fetch(`/api/v1/events/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Planeación eliminada");
                fetchEvents();
            } else {
                toast.error("Error al eliminar");
            }
        } catch {
            toast.error("Error de conexión");
        }
    };

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/v1/events");
            if (response.ok) {
                const data = await response.json();
                setEvents(data.events || []);
            }
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const filteredEvents = events.filter((e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.school?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Logística y Eventos</h2>
                    <p className="text-muted-foreground mt-1">
                        Gestiona y planifica los horarios para las aplicaciones de exámenes.
                    </p>
                </div>
                <AddEventDialog onEventAdded={fetchEvents} />
            </div>

            {/* Toolbar: search + view toggle */}
            <div className="flex items-center gap-2">
                <div className="flex items-center flex-1 bg-background px-3 py-2 rounded-lg border">
                    <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                    <Input
                        placeholder="Buscar por sede o evento..."
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-7 p-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1 border bg-background rounded-lg p-1 shrink-0">
                    <Button
                        variant={view === "list" ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setView("list")}
                        title="Vista de tarjetas"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={view === "kanban" ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setView("kanban")}
                        title="Vista Kanban"
                    >
                        <KanbanSquare className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={view === "calendar" ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setView("calendar")}
                        title="Vista de calendario"
                    >
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar legend */}
            {view === "calendar" && (
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span className="font-semibold">Leyenda:</span>
                    {Object.entries(EXAM_COLORS).map(([exam, cls]) => (
                        <span key={exam} className={cn("px-2 py-0.5 rounded font-bold uppercase", cls)}>{exam}</span>
                    ))}
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Hoy
                    </span>
                    <span className="italic">🎤 = solo evaluación oral (speaking)</span>
                </div>
            )}

            {isLoading ? (
                <div className="py-20 text-center text-muted-foreground animate-pulse">
                    Cargando eventos...
                </div>
            ) : view === "kanban" ? (
                <KanbanEventView
                    events={filteredEvents}
                    onEdit={setEditingEvent}
                    onDelete={handleDelete}
                />
            ) : view === "calendar" ? (
                <CalendarMonthView
                    events={filteredEvents}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                />
            ) : (
                /* ── LIST VIEW ── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                        <Card key={event.id} className="flex flex-col hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={statusVariant(event.status)}>
                                        {event.status}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-md">
                                            {event.exam_type}
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"
                                            onClick={() => setEditingEvent(event)}>
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDelete(event.id, event.title)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <CardTitle className="text-xl leading-tight pr-8">{event.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3 pb-2">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <MapPin className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">{event.school?.name}</span>
                                </div>

                                {event.sessions && event.sessions.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {event.sessions.map((s: any) => (
                                            <div key={s.id} className="space-y-0.5">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase", examColor(s.exam_type))}>
                                                        {s.exam_type}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <CalendarIcon className="h-3.5 w-3.5" />
                                                        <span className="text-xs">
                                                            {s.date ? format(new Date(s.date + "T12:00:00"), "dd MMM yyyy", { locale: es }) : "—"}
                                                        </span>
                                                    </div>
                                                </div>
                                                {s.speaking_date && s.speaking_date !== s.date && (
                                                    <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400">
                                                        <span className="text-[10px]">🎤</span>
                                                        <span className="text-[10px]">{format(new Date(s.speaking_date + "T12:00:00"), "dd MMM yyyy", { locale: es })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                        <span className="text-xs italic">Sin sesiones</span>
                                    </div>
                                )}

                                {event.staff && event.staff.length > 0 ? (
                                    <div className="pt-1 border-t border-dashed space-y-1">
                                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                                            <UserCheck className="h-3 w-3" /> Staff Asignado
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {event.staff.slice(0, 4).map((s: any) => (
                                                <span key={s.id} title={s.role}
                                                    className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border truncate max-w-[120px]">
                                                    {s.applicator?.name || "—"}
                                                </span>
                                            ))}
                                            {event.staff.length > 4 && (
                                                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">
                                                    +{event.staff.length - 4} más
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-1 border-t border-dashed">
                                        <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" /> Sin staff asignado
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-4 border-t bg-muted/20">
                                <Link href={`/dashboard/eventos/planner/${event.id}`} className="w-full">
                                    <Button variant="ghost" className="w-full justify-between hover:bg-primary/10 group">
                                        Abrir Planner
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}

                    {filteredEvents.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-muted/30 rounded-lg border border-dashed">
                            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                            <h3 className="text-lg font-medium">No hay eventos planeados</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Comienza creando una nueva planeación para estructurar los horarios.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <AddEventDialog
                open={!!editingEvent}
                onOpenChange={(v) => !v && setEditingEvent(null)}
                initialData={editingEvent}
                onEventAdded={() => { fetchEvents(); setEditingEvent(null); }}
            />
        </div>
    );
}
