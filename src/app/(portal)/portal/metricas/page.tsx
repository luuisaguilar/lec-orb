import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Calendar, CheckSquare, TrendingUp } from "lucide-react";
import { portalApiGet } from "@/lib/portal/server-fetch";

type MetricasResponse = {
    total_hours: number;
    total_events: number;
    total_slots: number;
    pending_balance: number;
    total_paid: number;
    role_distribution: Record<string, number>;
    certified_levels: string[] | null;
};

export default async function PortalMetricsPage() {
    const res = await portalApiGet<MetricasResponse>("/api/v1/portal/metricas");

    if (!res.ok) {
        if (res.status === 401) {
            return (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    Debes iniciar sesión para ver tus métricas.
                </div>
            );
        }
        if (res.status === 403) {
            return (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    Tu usuario no está vinculado a un aplicador.
                </div>
            );
        }
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                No se pudieron cargar las métricas: {res.message}
            </div>
        );
    }

    const {
        total_hours,
        total_events,
        total_slots,
        role_distribution,
        certified_levels: levelsRaw,
    } = res.data;

    const sortedRoles = Object.entries(role_distribution ?? {}).sort((a, b) => b[1] - a[1]);
    const maxRoles = sortedRoles.length > 0 ? Math.max(...sortedRoles.map((e) => e[1])) : 1;

    const certifiedLevels =
        levelsRaw && levelsRaw.length > 0 ? levelsRaw : ["Sin certificaciones cargadas"];

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
                        <div className="text-2xl font-bold">{Number(total_hours ?? 0).toFixed(1)}h</div>
                        <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Eventos Asistidos</CardTitle>
                        <Calendar className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total_events}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Turnos Completados</CardTitle>
                        <CheckSquare className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total_slots}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rol frecuente</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sortedRoles[0]?.[0] || "-"}</div>
                        <p className="text-xs text-muted-foreground mt-1">Rol más registrado en nómina</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Distribución por rol</CardTitle>
                        <CardDescription>
                            Frecuencia de líneas de trabajo en tu nómina (por rol asignado).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sortedRoles.length === 0 ? (
                            <div className="text-muted-foreground text-sm text-center py-4">
                                No hay datos suficientes.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedRoles.map(([roleName, count]) => (
                                    <div key={roleName} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{roleName}</span>
                                            <span className="text-muted-foreground">{count} líneas</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all rounded-full"
                                                style={{ width: `${(count / maxRoles) * 100}%` }}
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
                        <CardDescription>Niveles autorizados para aplicar por Cambridge.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {certifiedLevels.map((level: string) => (
                                <div
                                    key={level}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card text-sm font-medium shadow-sm"
                                >
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
