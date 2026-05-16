"use client";

import useSWR from "swr";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { CpDeniedState, CpLoadingState, CpStatCard } from "./_components/cp-ui";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CoordinacionProyectosOverviewPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const y = new Date().getFullYear();
    const { data, isLoading } = useSWR(`/api/v1/coordinacion-proyectos/overview?year=${y}`, fetcher);

    if (userLoading) return <CpLoadingState label="Cargando permisos…" />;
    if (!hasPermission(CP_MODULE, "view")) {
        return <CpDeniedState message="No tienes permiso para ver este módulo." />;
    }

    const p = data?.programProjects;
    const e = data?.examLines;

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CpStatCard title={`Proyectos ${data?.year ?? y}`} accent="sky" footer="Registros concentrado">
                {isLoading ? "…" : p?.count ?? 0}
            </CpStatCard>
            <CpStatCard title="Beneficiarios" accent="emerald">
                {isLoading ? "…" : p?.beneficiariesTotal ?? 0}
            </CpStatCard>
            <CpStatCard
                title="Ingreso proyectos"
                accent="amber"
                footer={
                    <span className="font-medium text-amber-800 dark:text-amber-300">
                        Sin ingreso: {p?.missingRevenueCount ?? 0}
                    </span>
                }
            >
                {isLoading ? "…" : new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(p?.revenueTotal ?? 0)}
            </CpStatCard>
            <CpStatCard
                title="Exámenes (líneas)"
                accent="violet"
                footer={
                    <>
                        <div>Cantidad aplicada: {e?.quantityTotal ?? 0}</div>
                        <div>
                            Monto:{" "}
                            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(e?.amountTotal ?? 0)}
                        </div>
                    </>
                }
            >
                {isLoading ? "…" : e?.count ?? 0}
            </CpStatCard>
        </div>
    );
}
