"use client";

import { useEffect, useState } from "react";
import {
    Users, School, Calendar as CalendarIcon, FileText,
    MapPin,
    TrendingUp, TrendingDown, AlertTriangle, DollarSign, Wallet, ListTodo
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionCalendarMonthView } from "@/components/dashboard/session-calendar-month";
import { TaskBucket } from "@/components/dashboard/my-work-buckets";
import { cn } from "@/lib/utils";

const EXAM_DOT_BG: Record<string, string> = {
    starters: "bg-yellow-400/90",
    movers: "bg-orange-400/90",
    flyers: "bg-amber-500/90",
    ket: "bg-blue-500/90",
    pet: "bg-violet-500/90",
    fce: "bg-rose-500/90",
};
function examDotBg(t: string | undefined | null) {
    if (!t) return "bg-primary/80";
    return EXAM_DOT_BG[t.toLowerCase()] ?? "bg-primary/80";
}

// ── Currency formatter ───────────────────────────────────────────────────────
function fmt(n: number) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────
export default function UnifiedDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [ihSummary, setIhSummary] = useState<any>(null);
    const [pettyCashBalance, setPettyCashBalance] = useState<number>(0);
    const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
    const [financeLoading, setFinanceLoading] = useState(false);
    const [myTasks, setMyTasks] = useState<any[]>([]);

    useEffect(() => {
        async function loadData() {
            try {
                setIsLoading(true);
                const [statsRes, eventsRes] = await Promise.all([
                    fetch("/api/v1/dashboard/stats"),
                    fetch("/api/v1/events?limit=100")
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (eventsRes.ok) setEvents((await eventsRes.json()).events || []);
                const tasksRes = await fetch("/api/v1/pm/tasks?mine=true");
                if (tasksRes.ok) setMyTasks((await tasksRes.json()).tasks || []);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        async function loadFinance() {
            setFinanceLoading(true);
            try {
                const [ihRes, pcRes, prRes] = await Promise.all([
                    fetch(`/api/v1/finance/ih/summary?year=${year}`),
                    fetch(`/api/v1/finance/petty-cash/balance?year=${year}`),
                    fetch("/api/v1/payroll"),
                ]);
                if (ihRes.ok) setIhSummary(await ihRes.json());
                if (pcRes.ok) setPettyCashBalance((await pcRes.json()).balance ?? 0);
                if (prRes.ok) setPayrollPeriods((await prRes.json()).periods ?? []);
            } catch (err) {
                console.error("Failed to load finance data", err);
            } finally {
                setFinanceLoading(false);
            }
        }
        loadFinance();
    }, [year]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!stats) return null;

    const { general, events: eventsStats, applicators, cenni } = stats;

    const payrollYearTotal = payrollPeriods
        .filter((p: any) => p.start_date?.startsWith(year))
        .reduce((sum: number, p: any) => sum + Number(p.total_amount ?? 0), 0);

    const allAlerts = ihSummary
        ? [
            ...(ihSummary.byRegion?.SONORA?.alerts ?? []).map((a: any) => ({ ...a, region: "Sonora" })),
            ...(ihSummary.byRegion?.BAJA_CALIFORNIA?.alerts ?? []).map((a: any) => ({ ...a, region: "BC" })),
          ].sort((a, b) => b.balance - a.balance)
        : [];

    const todayIso = new Date().toISOString().slice(0, 10);
    const myPending = myTasks.filter((task) => !task.completed_at);
    const myToday = myPending.filter((task) => task.due_date === todayIso);
    const myOverdue = myPending.filter((task) => task.due_date && task.due_date < todayIso);
    const myNext = myPending.filter((task) => task.due_date && task.due_date > todayIso).slice(0, 8);
    const myUnscheduled = myPending.filter((task) => !task.due_date);

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard General</h2>
                <p className="text-muted-foreground mt-1 text-lg">
                    Vista unificada de la plataforma.
                </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto">
                    <TabsTrigger value="overview" className="w-[150px] data-[state=active]:shadow-sm">Vista General</TabsTrigger>
                    <TabsTrigger value="events" className="w-[150px] data-[state=active]:shadow-sm">Eventos</TabsTrigger>
                    <TabsTrigger value="cenni" className="w-[150px] data-[state=active]:shadow-sm">Trámites CENNI</TabsTrigger>
                    <TabsTrigger value="applicators" className="w-[150px] data-[state=active]:shadow-sm">Aplicadores</TabsTrigger>
                    <TabsTrigger value="gerencial" className="w-[170px] data-[state=active]:shadow-sm">P&amp;L Gerencial</TabsTrigger>
                </TabsList>

                {/* ── GENERAL TAB ── */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Aplicadores Totales</CardTitle>
                                <Users className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{general.totalApplicators}</div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Colegios / Sedes</CardTitle>
                                <School className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{general.totalSchools}</div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Sesiones Programadas</CardTitle>
                                <CalendarIcon className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{general.totalSessions}</div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Casos CENNI</CardTitle>
                                <FileText className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{general.cenniTotal}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ListTodo className="h-5 w-5 text-primary" />
                                Mi trabajo
                            </CardTitle>
                            <CardDescription>Vista rápida de tareas asignadas a ti.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <TaskBucket title="Hoy" count={myToday.length} tasks={myToday} />
                                <TaskBucket title="Con atraso" count={myOverdue.length} tasks={myOverdue} />
                                <TaskBucket title="Siguiente" count={myNext.length} tasks={myNext} />
                                <TaskBucket title="Sin programar" count={myUnscheduled.length} tasks={myUnscheduled} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-8">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            Calendario de Sesiones
                        </h3>
                        <SessionCalendarMonthView
                            events={events}
                            currentMonth={currentMonth}
                            onMonthChange={setCurrentMonth}
                        />
                    </div>
                </TabsContent>

                {/* ── EVENTS TAB ── */}
                <TabsContent value="events" className="space-y-6 animate-in fade-in-50 duration-500">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Eventos este Mes</CardTitle>
                                <CardDescription>Total de eventos programados o en curso.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-primary">{general.eventsThisMonth}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Próximos Eventos</CardTitle>
                                <CardDescription>Eventos publicados listos para ejecución.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-emerald-600">{general.upcomingEvents}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Eventos por Estatus</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(eventsStats.byStatus).map(([status, count]: [string, any]) => (
                                        <div key={status} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                                <span className="font-medium">{status}</span>
                                            </div>
                                            <span className="text-muted-foreground font-semibold">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(eventsStats.byStatus).length === 0 && (
                                        <p className="text-muted-foreground text-sm">No hay datos</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Tipos de Examen</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(eventsStats.byExamType).map(([type, count]: [string, any]) => (
                                        <div key={type} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("h-3 w-3 rounded-full", examDotBg(type))} />
                                                <span className="font-medium uppercase">{type}</span>
                                            </div>
                                            <span className="text-muted-foreground font-semibold px-2 py-0.5 bg-muted rounded-full text-xs">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(eventsStats.byExamType).length === 0 && (
                                        <p className="text-muted-foreground text-sm">No hay datos</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── CENNI TAB ── */}
                <TabsContent value="cenni" className="space-y-6 animate-in fade-in-50 duration-500">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-200 dark:border-purple-900 border-2">
                            <CardHeader>
                                <CardTitle className="text-lg text-purple-700 dark:text-purple-400">Total de Casos</CardTitle>
                                <CardDescription>Trámites iniciados en la plataforma.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">{cenni.total}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Distribución por Estatus</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(cenni.byStatus).map(([status, count]: [string, any]) => (
                                        <div key={status} className="flex items-center justify-between">
                                            <span className="font-medium capitalize">{status.toLowerCase()}</span>
                                            <span className="font-bold text-lg">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(cenni.byStatus).length === 0 && (
                                        <p className="text-muted-foreground text-sm">No hay casos registrados aún.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── APPLICATORS TAB ── */}
                <TabsContent value="applicators" className="space-y-6 animate-in fade-in-50 duration-500">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Zonas Geográficas</CardTitle>
                                <CardDescription>Distribución de aplicadores por zona.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(applicators.byZone).map(([zone, count]: [string, any]) => (
                                        <div key={zone} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{zone}</span>
                                            </div>
                                            <span className="font-bold">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
}
