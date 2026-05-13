"use client";

import { Activity } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import CrmActivities from "@/components/crm/crm-activities";

export default function CRMActivitiesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start gap-4 mb-4">
        <AnimatedIcon
          variant="lucide"
          icon={Activity}
          animation="float"
          size={32}
          className="text-primary mt-1 shrink-0"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-outfit">
            Actividades
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Línea de tiempo de llamadas, reuniones y tareas pendientes con prospectos.
          </p>
        </div>
      </div>
      <CrmActivities />
    </div>
  );
}
