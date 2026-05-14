"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CoordinacionProyectosOverviewPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const y = new Date().getFullYear();
    const { data, isLoading } = useSWR(`/api/v1/coordinacion-proyectos/overview?year=${y}`, fetcher);

    if (userLoading) return <p className="text-muted-foreground">Cargando permisos…</p>;
    if (!hasPermission(CP_MODULE, "view")) {
        return <p className="text-destructive">No tienes permiso para ver este módulo.</p>;
    }

    const p = data?.programProjects;
    const e = data?.examLines;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Proyectos {data?.year}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{isLoading ? "…" : p?.count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Registros concentrado</p>
                </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Beneficiarios</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{isLoading ? "…" : p?.beneficiariesTotal ?? 0}</p>
                </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ingreso proyectos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">
                        {isLoading ? "…" : new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(p?.revenueTotal ?? 0)}
                    </p>
                    <p className="text-xs text-amber-500/90">Sin ingreso: {p?.missingRevenueCount ?? 0}</p>
                </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Exámenes (líneas)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{isLoading ? "…" : e?.count ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Cantidad aplicada: {e?.quantityTotal ?? 0}</p>
                    <p className="text-xs text-muted-foreground">
                        Monto:{" "}
                        {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(e?.amountTotal ?? 0)}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
