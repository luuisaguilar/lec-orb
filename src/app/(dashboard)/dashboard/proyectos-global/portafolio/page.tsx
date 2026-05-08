"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PmCreateProjectDialog } from "../_components/pm-create-project-dialog";
import { ProjectList } from "../_components/pm-presentation";
import { pmFetcher, type PmProject } from "../_lib/pm-types";

export default function ProyectosGlobalPortafolioPage() {
    const [q, setQ] = useState("");

    const projectQuery = useMemo(() => {
        const p = new URLSearchParams();
        if (q.trim()) p.set("q", q.trim());
        return p.toString();
    }, [q]);

    const { data: projectsData, isLoading, mutate } = useSWR<{ projects: PmProject[] }>(
        `/api/v1/pm/projects${projectQuery ? `?${projectQuery}` : ""}`,
        pmFetcher
    );

    const projects = projectsData?.projects ?? [];

    return (
        <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <CardTitle>Portafolio</CardTitle>
                    <CardDescription>{isLoading ? "Cargando..." : `${projects.length} proyecto(s)`}</CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="w-full sm:w-80">
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proyecto..." />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => mutate()} title="Refrescar">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <PmCreateProjectDialog
                            onCreated={() => {
                                void mutate();
                            }}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ProjectList projects={projects} emptyText="Sin proyectos registrados." />
            </CardContent>
        </Card>
    );
}
