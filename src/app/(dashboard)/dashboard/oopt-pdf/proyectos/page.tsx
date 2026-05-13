"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type ProjectRow = {
    id: string;
    title: string;
    event_id: string | null;
    total_pages: number;
    processed_count: number;
    errors_count: number;
    created_at: string;
    source_pdf_filename: string | null;
};

export default function OoptProyectosPage() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/v1/oopt/projects");
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
                if (!cancelled) setProjects(json.projects ?? []);
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? "No se pudo cargar.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/oopt-pdf">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Procesar PDF
                    </Link>
                </Button>
            </div>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <FolderOpen className="h-7 w-7" />
                    OOPT — Proyectos guardados
                </h1>
                <p className="text-muted-foreground mt-1">
                    Resultados persistidos, PDFs por alumno en almacenamiento seguro y notas de logística / análisis
                    por corrida.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista</CardTitle>
                    <CardDescription>
                        Cada proyecto corresponde a un guardado después de procesar el consolidado Oxford.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-8">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Cargando…
                        </div>
                    ) : error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : projects.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Aún no hay proyectos. Procesa un PDF en{" "}
                            <Link href="/dashboard/oopt-pdf" className="underline">
                                OOPT — PDF por alumno
                            </Link>{" "}
                            y usa <strong>Guardar proyecto</strong>.
                        </p>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Título</TableHead>
                                        <TableHead className="w-28 text-right">Páginas</TableHead>
                                        <TableHead className="w-28 text-right">Errores</TableHead>
                                        <TableHead className="min-w-[120px]">Creado</TableHead>
                                        <TableHead className="w-24" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.title}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {p.processed_count}/{p.total_pages}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {p.errors_count}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(p.created_at).toLocaleString("es-MX", {
                                                    dateStyle: "short",
                                                    timeStyle: "short",
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="secondary" size="sm" asChild>
                                                    <Link href={`/dashboard/oopt-pdf/proyectos/${p.id}`}>
                                                        Abrir
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
