"use client";

import { useState, useEffect } from "react";
import { 
  Workflow, 
  Target, 
  Users, 
  ArrowRightLeft, 
  Package, 
  FileText, 
  AlertCircle, 
  Zap,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import mermaid from "mermaid";

import { HR_PROCESSES } from "@/lib/data/hr";

export default function SGCProcesses() {
  const [selectedId, setSelectedId] = useState(HR_PROCESSES[0].id);
  const selectedProcess = HR_PROCESSES.find(p => p.id === selectedId) || HR_PROCESSES[0];

  useEffect(() => {
    mermaid.initialize({ 
        startOnLoad: true, 
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Outfit, sans-serif'
    });
    mermaid.contentLoaded();
  }, [selectedId]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar List */}
      <div className="w-full lg:w-80 space-y-3">
        <div className="px-1 mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mapa de Procesos</h3>
        </div>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-1.5 pr-4">
            {HR_PROCESSES.map((process) => (
              <button
                key={process.id}
                onClick={() => setSelectedId(process.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all group relative overflow-hidden",
                  selectedId === process.id 
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedId === process.id ? "bg-white/20" : "bg-slate-800 group-hover:bg-slate-700"
                  )}>
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold uppercase opacity-60 truncate">{process.id}</p>
                    <p className="text-sm font-bold truncate">{process.title}</p>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-transform",
                    selectedId === process.id ? "translate-x-1" : "opacity-0"
                  )} />
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Process Content */}
      <div className="flex-1 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DetailCard icon={<Target className="text-primary" />} title="KPIs / Objetivos" content={selectedProcess.kpis} />
          <DetailCard icon={<Users className="text-emerald-400" />} title="Actores / Dueños" content={selectedProcess.actors} />
          <DetailCard icon={<ArrowRightLeft className="text-amber-400" />} title="Entradas / Salidas" content={selectedProcess.inputsOutputs} />
          <DetailCard icon={<Package className="text-blue-400" />} title="Recursos" content={selectedProcess.resources} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Mermaid Diagram */}
          <Card className="xl:col-span-2 bg-slate-950/40 border-slate-800 shadow-2xl relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/50">
              <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Workflow className="w-4 h-4 text-primary" /> Diagrama de Flujo
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-8 flex justify-center items-center min-h-[400px]">
              <div className="mermaid w-full">
                {selectedProcess.mermaidCode}
              </div>
            </CardContent>
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -z-10" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -z-10" />
          </Card>

          {/* Docs & Risks */}
          <div className="space-y-6">
            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" /> Documentación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedProcess.documents.split('\n').map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors">
                    <span className="text-xs text-slate-300 truncate max-w-[180px]">{doc}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary">
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" /> Riesgos Críticos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedProcess.risks.split('\n').map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                    <AlertCircle className="w-3 h-3 text-red-500 mt-1 shrink-0" />
                    <span className="text-[11px] text-red-200/80">{risk}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-400 italic">&ldquo;{selectedProcess.improvements}&rdquo;</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
  return (
    <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-colors group">
      <CardContent className="p-4 flex gap-3">
        <div className="p-2 rounded-xl bg-slate-950 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="overflow-hidden">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{content}</p>
        </div>
      </CardContent>
    </Card>
  );
}
