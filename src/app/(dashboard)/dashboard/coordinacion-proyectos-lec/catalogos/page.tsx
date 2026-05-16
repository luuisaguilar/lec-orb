"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { CpDeniedState, CpListCard, CpLoadingState } from "../_components/cp-ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CatalogosCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const { data, isLoading } = useSWR("/api/v1/coordinacion-proyectos/catalog", fetcher);

    if (userLoading) return <CpLoadingState />;
    if (!hasPermission(CP_MODULE, "view")) return <CpDeniedState message="Sin acceso." />;

    const renderList = (title: string, items: { id: string; name: string }[]) => (
        <CpListCard title={title}>
            {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
                <ul className="max-h-72 space-y-0.5 overflow-y-auto text-sm">
                    {(items ?? []).map((x) => (
                        <li
                            key={x.id}
                            className="rounded-md px-2 py-1.5 text-foreground/90 odd:bg-muted/50 even:bg-transparent dark:odd:bg-muted/25"
                        >
                            {x.name}
                        </li>
                    ))}
                </ul>
            )}
        </CpListCard>
    );

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {renderList("Departamentos", data?.departments ?? [])}
            {renderList("Tipos de examen", data?.examTypes ?? [])}
            {renderList("Producto / servicio", data?.productServices ?? [])}
        </div>
    );
}
