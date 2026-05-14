"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";

export default function ImportarCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const [entity, setEntity] = useState<"program_projects" | "exam_sales_lines">("program_projects");
    const [json, setJson] = useState("[]");
    const [busy, setBusy] = useState(false);

    if (userLoading) return <p className="text-muted-foreground">Cargando…</p>;
    if (!hasPermission(CP_MODULE, "edit")) return <p className="text-destructive">Se requiere permiso de edición.</p>;

    const run = async () => {
        let rows: unknown[];
        try {
            rows = JSON.parse(json);
            if (!Array.isArray(rows)) throw new Error("Debe ser un arreglo JSON");
        } catch (e: any) {
            toast.error(e?.message || "JSON inválido");
            return;
        }
        setBusy(true);
        try {
            const res = await fetch("/api/v1/coordinacion-proyectos/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entity, rows }),
            });
            const body = await res.json();
            if (!res.ok) {
                toast.error(body.error || "Error");
                return;
            }
            toast.success(`Insertadas: ${body.inserted}. Errores: ${body.errors?.length ?? 0}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-4">
            <p className="text-sm text-muted-foreground">
                Pega un arreglo JSON de filas. Para proyectos se reconocen campos como Mes (ENE…), Departamento, Descripción, Tipo de
                cliente, Producto/Servicio, Beneficiados, Ingreso, Tamaño. Para exámenes: exam_month o Mes, candidato, examen, cantidad,
                monto.
            </p>
            <div className="space-y-2">
                <Label>Entidad</Label>
                <Select value={entity} onValueChange={(v) => setEntity(v as typeof entity)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="program_projects">Concentrado de proyectos</SelectItem>
                        <SelectItem value="exam_sales_lines">Líneas de exámenes</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>JSON (arreglo de objetos)</Label>
                <Textarea value={json} onChange={(e) => setJson(e.target.value)} rows={14} className="font-mono text-xs" />
            </div>
            <Button onClick={run} disabled={busy}>
                {busy ? "Importando…" : "Importar"}
            </Button>
        </div>
    );
}
