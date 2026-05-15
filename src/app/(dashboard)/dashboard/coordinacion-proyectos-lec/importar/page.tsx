"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CP_MODULE } from "@/lib/coordinacion-proyectos/schemas";
import { useUser } from "@/lib/hooks/use-user";
import { CpDeniedState, CpLoadingState, CpPanel } from "../_components/cp-ui";

export default function ImportarCpPage() {
    const { hasPermission, isLoading: userLoading } = useUser();
    const [entity, setEntity] = useState<"program_projects" | "exam_sales_lines">("program_projects");
    const [json, setJson] = useState("[]");
    const [busy, setBusy] = useState(false);

    if (userLoading) return <CpLoadingState />;
    if (!hasPermission(CP_MODULE, "edit")) {
        return <CpDeniedState message="Se requiere permiso de edición para importar." />;
    }

    const run = async () => {
        let rows: unknown[];
        try {
            rows = JSON.parse(json);
            if (!Array.isArray(rows)) throw new Error("Debe ser un arreglo JSON");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "JSON inválido";
            toast.error(msg);
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
        <CpPanel
            title="Importación masiva"
            description="JSON de filas según la entidad elegida. Revisa la wiki para el mapeo de columnas tipo Excel."
        >
            <p className="text-sm leading-relaxed text-muted-foreground">
                Para proyectos se reconocen campos como Mes (ENE…), Departamento, Descripción, Tipo de cliente, Producto/Servicio,
                Beneficiados, Ingreso, Tamaño. Para exámenes: exam_month o Mes, candidato, examen, cantidad, monto.
            </p>
            <div className="space-y-2">
                <Label className="text-foreground">Entidad</Label>
                <Select value={entity} onValueChange={(v) => setEntity(v as typeof entity)}>
                    <SelectTrigger className="border-border/90 bg-background dark:bg-background/80">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="program_projects">Concentrado de proyectos</SelectItem>
                        <SelectItem value="exam_sales_lines">Líneas de exámenes</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-foreground">JSON (arreglo de objetos)</Label>
                <Textarea
                    value={json}
                    onChange={(e) => setJson(e.target.value)}
                    rows={14}
                    className="font-mono text-xs leading-relaxed border-border/90 bg-muted/30 text-foreground dark:bg-muted/15"
                />
            </div>
            <Button type="button" onClick={run} disabled={busy} className="shadow-sm">
                {busy ? "Importando…" : "Importar"}
            </Button>
        </CpPanel>
    );
}
