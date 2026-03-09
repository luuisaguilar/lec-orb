import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Calendar, CheckSquare, TrendingUp } from "lucide-react";
import {
    mockPayrollEntries,
    mockSlots,
    mockEventExams,
} from "@/lib/demo/data";

const APPLICATOR_ID = "applicator-001"; // Hardcoded for demo

export default function PortalMetricsPage() {
    // 1. Get Payroll Metrics
    const myPayroll = mockPayrollEntries.filter((p) => p.applicator_id === APPLICATOR_ID);

    const totalHours = myPayroll.reduce((sum, p) => sum + p.hours_worked, 0);
    const totalEvents = myPayroll.reduce((sum, p) => sum + p.events_count, 0);
    const totalSlots = myPayroll.reduce((sum, p) => sum + p.slots_count, 0);

    // 2. Get Exams / Level Distribution
    const mySlots = mockSlots.filter((s) => s.applicator_id === APPLICATOR_ID);
    const examCounts: Record<string, number> = {};

    mySlots.forEach((slot) => {
        const ee = mockEventExams.find((e) => e.id === slot.event_exam_id);
        const name = ee?.exam_name || "Otros";
        examCounts[name] = (examCounts[name] || 0) + 1;
    });

    const sortedExams = Object.entries(examCounts)
        .sort((a, b) => b[1] - a[1]);

    const maxExams = sortedExams.length > 0 ? Math.max(...sortedExams.map(e => e[1])) : 1;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Métricas de Aplicación</h1>
                <p className="text-muted-foreground">
                    Resumen de tu rendimiento, horas de aplicación y experiencia por nivel.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Horas Aplicadas</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
                        <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Eventos Asistidos</CardTitle>
                        <Calendar className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEvents}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Turnos Completados</CardTitle>
                        <CheckSquare className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSlots}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Nivel Frecuente</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sortedExams[0]?.[0] || "-"}</div>
                        <p className="text-xs text-muted-foreground mt-1">Examen más aplicado</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Distribución por Examen</CardTitle>
                        <CardDescription>
                            Frecuencia de aplicación segmentada por certificación Cambridge.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sortedExams.length === 0 ? (
                            <div className="text-muted-foreground text-sm text-center py-4">
                                No hay datos suficientes.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedExams.map(([examName, count]) => (
                                    <div key={examName} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{examName}</span>
                                            <span className="text-muted-foreground">{count} turnos</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all rounded-full"
                                                style={{ width: `${(count / maxExams) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1 border-dashed bg-muted/20">
                    <CardHeader>
                        <CardTitle>Certificaciones Activas</CardTitle>
                        <CardDescription>
                            Niveles autorizados para aplicar por Cambridge.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {/* In a real app we'd map over applicator.certified_levels */}
                            {["Starters", "Movers", "Flyers"].map((level) => (
                                <div key={level} className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card text-sm font-medium shadow-sm">
                                    <CheckSquare className="h-4 w-4 text-green-500" />
                                    {level}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            Para añadir nuevas certificaciones, contacta a la coordinación de examinadores.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
