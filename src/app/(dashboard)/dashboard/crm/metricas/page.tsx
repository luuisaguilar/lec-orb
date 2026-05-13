"use client";

import { BarChart3 } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import CrmMetrics from "@/components/crm/crm-metrics";

export default function CRMMetricsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start gap-4 mb-4">
        <AnimatedIcon
          variant="lucide"
          icon={BarChart3}
          animation="float"
          size={32}
          className="text-primary mt-1 shrink-0"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-outfit">
            Métricas Comerciales
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Análisis de conversión, valor de pipeline y proyecciones de ventas.
          </p>
        </div>
      </div>
      <CrmMetrics />
    </div>
  );
}
