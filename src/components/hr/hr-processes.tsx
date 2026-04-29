"use client";

import { useState } from "react";
import {
  Workflow,
  Search,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  Users,
  ArrowRightLeft,
  HardDrive,
  FileText,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HR_PROCESSES, BusinessProcess } from "@/lib/data/hr";

export default function HRProcesses() {
  const [search, setSearch] = useState("");
  const [selectedProcess, setSelectedProcess] = useState<BusinessProcess | null>(HR_PROCESSES[0]);

  const filteredProcesses = HR_PROCESSES.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar List */}
      <Card className="w-full lg:w-80 bg-slate-900/40 border-slate-800 backdrop-blur-sm flex flex-col overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-lg font-outfit text-white">Procesos SGC</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar proceso..."
              className="pl-9 bg-slate-950/50 border-slate-800 text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-1 py-2">
            {filteredProcesses.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProcess(p)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group",
                  selectedProcess?.id === p.id 
                    ? "bg-primary text-white shadow-lg" 
                    : "hover:bg-slate-800/50 text-slate-400"
                )}
              >
                <div className={cn(
                  "p-2 rounded-md",
                  selectedProcess?.id === p.id ? "bg-white/20" : "bg-slate-800 group-hover:bg-slate-700"
                )}>
                  <Workflow className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.title}</p>
                  <p className="text-[10px] opacity-70 uppercase tracking-wider">{p.id}</p>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 shrink-0 transition-transform",
                  selectedProcess?.id === p.id ? "translate-x-1" : "opacity-0"
                )} />
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Process Detail View */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {selectedProcess ? (
          <ScrollArea className="flex-1">
            <div className="space-y-6 pr-4 pb-8">
              {/* Header Card */}
              <Card className="bg-slate-900/40 border-slate-800 border-l-4 border-l-primary backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="w-fit text-primary border-primary/30 bg-primary/5 uppercase text-[10px]">
                      {selectedProcess.id}
                    </Badge>
                    <h2 className="text-3xl font-bold text-white font-outfit">{selectedProcess.title}</h2>
                    <p className="text-slate-400 text-sm">
                      Mapa detallado de interacciones, riesgos y métricas del sistema.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Stats / KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/30 border-slate-800 hover:border-primary/20 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Métricas (KPIs)</p>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{selectedProcess.kpis}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/30 border-slate-800 hover:border-red-500/20 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Riesgos (AMEF)</p>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{selectedProcess.risks}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/30 border-slate-800 hover:border-green-500/20 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mejoras</p>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{selectedProcess.improvements}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <section className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
                      <Users className="w-4 h-4 text-primary" /> Actores Implicados
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/20 p-3 rounded-lg">
                      {selectedProcess.actors}
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
                      <ArrowRightLeft className="w-4 h-4 text-primary" /> Entradas y Salidas
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/20 p-3 rounded-lg whitespace-pre-line">
                      {selectedProcess.inputsOutputs}
                    </p>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
                      <HardDrive className="w-4 h-4 text-primary" /> Recursos Necesarios
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/20 p-3 rounded-lg whitespace-pre-line">
                      {selectedProcess.resources}
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
                      <FileText className="w-4 h-4 text-primary" /> Documentación
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/20 p-3 rounded-lg whitespace-pre-line">
                      {selectedProcess.documents}
                    </p>
                  </section>
                </div>
              </div>

              {/* Diagram Section */}
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
                  <Workflow className="w-4 h-4 text-primary" /> Diagrama de Flujo
                </h3>
                <Card className="bg-slate-950/60 border-slate-800 h-80 flex items-center justify-center overflow-hidden">
                  <div className="p-6 text-center space-y-3">
                    <Workflow className="w-12 h-12 text-slate-700 mx-auto opacity-30" />
                    <div className="space-y-1">
                      <p className="text-slate-500 text-sm font-mono whitespace-pre text-left bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                        {selectedProcess.mermaidCode}
                      </p>
                      <p className="text-[10px] text-slate-600 italic mt-2">
                        Diagrama renderizado vía Mermaid.js (Módulo en migración)
                      </p>
                    </div>
                  </div>
                </Card>
              </section>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Workflow className="w-16 h-16 mb-4 opacity-20" />
            <p>Selecciona un proceso para ver los detalles</p>
          </div>
        )}
      </div>
    </div>
  );
}
