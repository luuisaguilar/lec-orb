"use client";

import { LayoutDashboard } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import CrmPipeline from "@/components/crm/crm-pipeline";

export default function CRMPipelinePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start gap-4 mb-4">
        <AnimatedIcon
          variant="lucide"
          icon={LayoutDashboard}
          animation="float"
          size={32}
          className="text-primary mt-1 shrink-0"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-outfit">
            Pipeline Comercial
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Gestiona el flujo de ventas arrastrando las oportunidades entre las diferentes etapas.
          </p>
        </div>
      </div>
      <CrmPipeline />
    </div>
  );
}
