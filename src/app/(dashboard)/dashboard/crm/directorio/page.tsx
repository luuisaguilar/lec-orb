"use client";

import { Users } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import CrmDirectory from "@/components/crm/crm-directory";

export default function CRMDirectoryPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start gap-4 mb-4">
        <AnimatedIcon
          variant="lucide"
          icon={Users}
          animation="float"
          size={32}
          className="text-primary mt-1 shrink-0"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-outfit">
            Directorio Comercial
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Directorio completo de contactos, empresas, escuelas y el estatus de sus oportunidades.
          </p>
        </div>
      </div>
      <CrmDirectory />
    </div>
  );
}
