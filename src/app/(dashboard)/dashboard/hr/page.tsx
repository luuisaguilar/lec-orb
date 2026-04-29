"use client";

import { useState } from "react";
import { 
  Users, 
  Target, 
  Workflow, 
  ClipboardCheck, 
  Info,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HROnboarding from "@/components/hr/hr-onboarding";
import HRProfiles from "@/components/hr/hr-profiles";
import HRProcesses from "@/components/hr/hr-processes";
import HRAudit from "@/components/hr/hr-audit";

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("onboarding");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white font-outfit">
          Dashboard <span className="text-primary italic">RRHH & SGC</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Gestión integral de Capital Humano y Sistema de Gestión de Calidad (ISO 9001/21001) para Languages Education Consulting.
        </p>
      </div>

      <Tabs defaultValue="onboarding" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4 overflow-x-auto">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1 h-auto">
            <TabsTrigger 
              value="onboarding" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Info className="w-4 h-4 mr-2" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger 
              value="profiles" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Users className="w-4 h-4 mr-2" />
              Perfiles de Puesto
            </TabsTrigger>
            <TabsTrigger 
              value="processes" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <Workflow className="w-4 h-4 mr-2" />
              Procesos SGC
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Auditoría Interna
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

          <TabsContent value="processes">
            <HRProcesses />
          </TabsContent>

          <TabsContent value="audit">
            <HRAudit />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
