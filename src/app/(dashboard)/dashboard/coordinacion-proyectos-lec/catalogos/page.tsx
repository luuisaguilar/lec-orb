"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CatalogosCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const { data, isLoading } = useSWR("/api/v1/coordinacion-proyectos/catalog", fetcher);

    if (userLoading) return <p className="text-muted-foreground">Cargando…</p>;
    if (!hasPermission(CP_MODULE, "view")) return <p className="text-destructive">Sin acceso.</p>;

    const renderList = (title: string, items: { id: string; name: string }[]) => (
        <Card className="border-slate-700/50 bg-slate-900/40">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : (
                    <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                        {(items ?? []).map((x) => (
                            <li key={x.id}>{x.name}</li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {renderList("Departamentos", data?.departments ?? [])}
            {renderList("Tipos de examen", data?.examTypes ?? [])}
            {renderList("Producto / servicio", data?.productServices ?? [])}
        </div>
    );
}
