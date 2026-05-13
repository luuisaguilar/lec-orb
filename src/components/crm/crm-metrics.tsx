"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CrmMetrics() {
  return (
    <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/5 bg-background/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-outfit text-indigo-400">Métricas y Reportes</CardTitle>
        <CardDescription>
          Análisis de embudo de ventas, conversión y valor del pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] flex items-center justify-center border-2 border-dashed border-indigo-500/20 rounded-xl bg-indigo-500/5">
          <p className="text-muted-foreground font-medium">Dashboard de métricas en construcción...</p>
        </div>
      </CardContent>
    </Card>
  );
}
