"use client";

import { useState } from "react";
import {
  Users,
  Info,
  Workflow,
  UserCog,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import HROnboarding from "@/components/hr/hr-onboarding";
import HRProfiles from "@/components/hr/hr-profiles";
import HROrgChart from "@/components/hr/hr-org-chart";

export default function RRHHDashboard() {
  const [activeTab, setActiveTab] = useState("onboarding");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start gap-4">
        <AnimatedIcon
          variant="lucide"
          icon={UserCog}
          animation="float"
          size={32}
          className="text-primary mt-1 shrink-0"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-outfit">
            Módulo de <span className="text-primary italic">Recursos Humanos</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Gestión integral de Capital Humano, Onboarding, Evaluaciones de Desempeño y Perfiles de Puesto para Languages Education Consulting.
          </p>
        </div>
      </div>

      <Tabs defaultValue="onboarding" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4 overflow-x-auto">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1 h-auto">
            <TabsTrigger 
              value="onboarding" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Info className="w-4 h-4 mr-2" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger 
              value="profiles" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Users className="w-4 h-4 mr-2" />
              Perfiles de Puesto
            </TabsTrigger>
            <TabsTrigger
              value="chart"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 group"
            >
              <AnimatedIcon
                variant="lucide"
                icon={Workflow}
                animation="hover-rotate"
                size={16}
                className="mr-2"
              />
              Organigrama
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-2 min-h-[600px]">
          <TabsContent value="onboarding">
            <HROnboarding />
          </TabsContent>
          
          <TabsContent value="profiles">
            <HRProfiles />
          </TabsContent>

          <TabsContent value="chart">
            <HROrgChart />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
