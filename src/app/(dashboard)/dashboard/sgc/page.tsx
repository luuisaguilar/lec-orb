"use client";

import { useState } from "react";
import {
  Workflow,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  ClipboardList,
  Wrench,
  History as HistoryIcon,
  TrendingUp
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SGCProcesses from "@/components/sgc/sgc-processes";
import SGCAudit from "@/components/sgc/sgc-audit";
import SGCRisks from "@/components/sgc/sgc-risks";
import DocumentExplorer from "@/components/documents/document-explorer";
import SGCNonconformities from "@/components/sgc/sgc-nonconformities";
import SGCActions from "@/components/sgc/sgc-actions";
import SGCReviews from "@/components/sgc/sgc-reviews";
import SGCDashboard from "@/components/sgc/sgc-dashboard";

export default function SGCDashboardPage() {
  const [activeTab, setActiveTab] = useState("metrics");

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

      <Tabs defaultValue="metrics" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-4 overflow-x-auto">
          <TabsList className="bg-slate-900/40 border border-slate-800/60 p-1 h-auto min-w-max flex-nowrap backdrop-blur-sm shadow-inner">
            <TabsTrigger 
              value="metrics" 
              className="h-auto min-h-10 shrink-0 whitespace-nowrap leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent transition-all px-4 py-2.5 relative group"
            >
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300" />
              <TrendingUp className="w-4 h-4 mr-2" />
              Métricas y KPIs
            </TabsTrigger>
            <TabsTrigger 
              value="nonconformities" 
              className="h-auto min-h-10 shrink-0 whitespace-nowrap leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent transition-all px-4 py-2.5 relative group"
            >
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300" />
              <ClipboardList className="w-4 h-4 mr-2" />
              No Conformidades
            </TabsTrigger>
            <TabsTrigger 
              value="actions" 
              className="h-auto min-h-10 shrink-0 whitespace-nowrap leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent transition-all px-4 py-2.5 relative group"
            >
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300" />
              <Wrench className="w-4 h-4 mr-2" />
              Acciones CAPA
            </TabsTrigger>
            <TabsTrigger 
              value="processes" 
              className="h-auto min-h-10 shrink-0 whitespace-nowrap leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent transition-all px-4 py-2.5 relative group"
            >
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300" />
              <Workflow className="w-4 h-4 mr-2" />
              Mapa de Procesos
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="h-auto min-h-10 shrink-0 whitespace-nowrap leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent transition-all px-4 py-2.5 relative group"
            >
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300" />
              <FileText className="w-4 h-4 mr-2" />
              Lista Maestra
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="h-auto min-h-10 shrink-0 whitespace-nowrap leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent transition-all px-4 py-2.5 relative group"
            >
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300" />
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Auditoría Interna
            </TabsTrigger>
            <TabsTrigger 
              value="risks" 
              className="h-auto min-h-10 shrink-0 whitespace-nowrap leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent transition-all px-4 py-2.5 relative group"
            >
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300" />
              <AlertTriangle className="w-4 h-4 mr-2" />
              Matriz de Riesgos
            </TabsTrigger>
            <TabsTrigger 
              value="reviews" 
              className="h-auto min-h-10 shrink-0 whitespace-nowrap leading-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent transition-all px-4 py-2.5 relative group"
            >
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300" />
              <HistoryIcon className="w-4 h-4 mr-2" />
              Revisión Directiva
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-2 min-h-[600px]">
          <TabsContent value="metrics">
            <SGCDashboard />
          </TabsContent>
          <TabsContent value="nonconformities">
            <SGCNonconformities />
          </TabsContent>

          <TabsContent value="actions">
            <SGCActions />
          </TabsContent>

          <TabsContent value="processes">
            <SGCProcesses />
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

          <TabsContent value="reviews">
            <SGCReviews />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
