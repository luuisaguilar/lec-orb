import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProyectosGlobalTareasContent } from "./tareas-client";

function TareasLoadingFallback() {
    return (
        <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Cargando tareas…</CardContent>
        </Card>
    );
}

export default function ProyectosGlobalTareasPage() {
    return (
        <Suspense fallback={<TareasLoadingFallback />}>
            <ProyectosGlobalTareasContent />
        </Suspense>
    );
}
