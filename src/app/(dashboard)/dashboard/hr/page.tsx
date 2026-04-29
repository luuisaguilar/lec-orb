"use client";

import { useState } from "react";
import {
  Users,
  Workflow,
  ClipboardCheck,
  Info,
  GitBranch,
  ShieldAlert,
  FileText
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HROnboarding from "@/components/hr/hr-onboarding";
import HRProfiles from "@/components/hr/hr-profiles";
import HRProcesses from "@/components/hr/hr-processes";
import HRAudit from "@/components/hr/hr-audit";
import HROrgChart from "@/components/hr/hr-org-chart";
import HRRisks from "@/components/hr/hr-risks";
import HRDocs from "@/components/hr/hr-docs";

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("onboarding");

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-white font-outfit">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">LEC</span> Dashboard
          <span className="text-slate-500 font-light ml-3">RRHH & SGC</span>
        </h1>
        <p className="text-slate-400 max-w-3xl text-lg">
          Sistema de Gestión Integral: Capital Humano, Calidad (ISO 9001/21001) y Responsabilidad Social.
        </p>
      </div>

      <Tabs defaultValue="onboarding" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center mb-8 overflow-x-auto no-scrollbar">
          <TabsList className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 p-1.5 h-auto rounded-xl">
            <TabsTrigger 
              value="onboarding" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg transition-all"
            >
              <Info className="w-4 h-4 mr-2" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger 
              value="orgchart" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg transition-all"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Organigrama
            </TabsTrigger>
            <TabsTrigger 
              value="profiles" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg transition-all"
            >
              <Users className="w-4 h-4 mr-2" />
              Perfiles
            </TabsTrigger>
            <TabsTrigger 
              value="processes" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg transition-all"
            >
              <Workflow className="w-4 h-4 mr-2" />
              Procesos
            </TabsTrigger>
            <TabsTrigger 
              value="risks" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg transition-all"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Riesgos (AMEF)
            </TabsTrigger>
            <TabsTrigger 
              value="docs" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg transition-all"
            >
              <FileText className="w-4 h-4 mr-2" />
              Documentos
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg transition-all"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Auditoría
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-2">
          <TabsContent value="onboarding" className="animate-in fade-in zoom-in-95 duration-300">
            <HROnboarding />
          </TabsContent>

          <TabsContent value="orgchart" className="animate-in fade-in zoom-in-95 duration-300">
            <HROrgChart />
          </TabsContent>
          
          <TabsContent value="profiles" className="animate-in fade-in zoom-in-95 duration-300">
            <HRProfiles />
          </TabsContent>

          <TabsContent value="processes" className="animate-in fade-in zoom-in-95 duration-300">
            <HRProcesses />
          </TabsContent>

          <TabsContent value="risks" className="animate-in fade-in zoom-in-95 duration-300">
            <HRRisks />
          </TabsContent>

          <TabsContent value="docs" className="animate-in fade-in zoom-in-95 duration-300">
            <HRDocs />
          </TabsContent>

          <TabsContent value="audit" className="animate-in fade-in zoom-in-95 duration-300">
            <HRAudit />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
