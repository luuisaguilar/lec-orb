"use client";

import { useState } from "react";
import {
  Workflow,
  ClipboardCheck,
  FileText,
  AlertTriangle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HRProcesses from "@/components/hr/hr-processes";
import SGCAudit from "@/components/sgc/sgc-audit";
import SGCRisks from "@/components/sgc/sgc-risks";
import DocumentExplorer from "@/components/documents/document-explorer";

export default function SGCDashboard() {
  const [activeTab, setActiveTab] = useState("processes");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-outfit">
          Módulo de <span className="text-primary italic">Calidad (SGC)</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Sistema de Gestión de Calidad (ISO 9001/21001). Mapeo de Procesos, KPIs, Lista Maestra de Documentos, Matriz de Riesgos y Auditoría Interna.
        </p>
      </div>

      <Tabs defaultValue="processes" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4 overflow-x-auto">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1 h-auto flex-wrap">
            <TabsTrigger 
              value="processes" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <Workflow className="w-4 h-4 mr-2" />
              Mapa de Procesos
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <FileText className="w-4 h-4 mr-2" />
              Lista Maestra
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Auditoría Interna
            </TabsTrigger>
            <TabsTrigger 
              value="risks" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Matriz de Riesgos (AMEF)
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-2 min-h-[600px]">
          <TabsContent value="processes">
            <HRProcesses />
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-4">
              <div className="flex flex-col gap-1 px-1">
                <h2 className="text-xl font-bold text-foreground">Lista Maestra de Documentos</h2>
                <p className="text-sm text-slate-400">Acceso sincronizado a todos los formatos y archivos del sistema de gestión.</p>
              </div>
              <DocumentExplorer hideHeader className="p-0" />
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <SGCAudit />
          </TabsContent>

          <TabsContent value="risks">
            <SGCRisks />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
