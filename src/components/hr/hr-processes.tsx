"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
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
  Activity,
  Loader2,
  CheckCircle2,
  Target,
  Edit,
  Plus,
  Download,
  Building2,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// Define DB Types based on the 20260429_sgc_tables migration
interface SgcProcess {
  id: string;
  title: string | null;
  improvements: string | null;
  actors: string | null;
  inputs_outputs: string | null;
  resources: string | null;
  documents: string | null;
  mermaid_code: string | null;
  responsible_area: string | null;
  version: string | null;
  last_review_date: string | null;
}

interface KpiMetric {
  id: string;
  process_id: string;
  metric_name: string | null;
  target_value: string | null;
  current_value: string | null;
  frequency: string | null;
  evidence_source: string | null;
}

interface RiskAssessment {
  id: string;
  process_id: string;
  risk_name: string | null;
  severity: string | null;
  probability: string | null;
  mitigation_plan: string | null;
  status: string | null;
}

export default function HRProcesses() {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  const { data, isLoading, error } = useSWR("sgc-processes-dashboard", async () => {
    const [procRes, kpiRes, riskRes] = await Promise.all([
      supabase.from("sgc_processes").select("*").order("id"),
      supabase.from("kpi_metrics").select("*"),
      supabase.from("risk_assessments").select("*")
    ]);

    if (procRes.error) throw procRes.error;
    if (kpiRes.error) throw kpiRes.error;
    if (riskRes.error) throw riskRes.error;

    return {
      processes: (procRes.data ?? []) as SgcProcess[],
      kpis: (kpiRes.data ?? []) as KpiMetric[],
      risks: (riskRes.data ?? []) as RiskAssessment[],
    };
  });

  const processes = useMemo(() => data?.processes ?? [], [data?.processes]);
  const kpis = useMemo(() => data?.kpis ?? [], [data?.kpis]);
  const risks = useMemo(() => data?.risks ?? [], [data?.risks]);

  const selectedProcess = useMemo(() => {
    if (!processes.length) return null;
    const id = selectedProcessId && processes.some((p) => p.id === selectedProcessId)
      ? selectedProcessId
      : processes[0].id;
    return processes.find((p) => p.id === id) ?? null;
  }, [processes, selectedProcessId]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProcesses = processes.filter((p) => {
    const title = (p.title ?? "").toLowerCase();
    const id = (p.id ?? "").toLowerCase();
    return title.includes(normalizedSearch) || id.includes(normalizedSearch);
  });

  const processKpis = kpis.filter(k => k.process_id === selectedProcess?.id);
  const processRisks = risks.filter(r => r.process_id === selectedProcess?.id);

  // Helper to render text with "Intelligent Links"
  const renderIntelligentLinks = (text: string | null) => {
    if (!text?.trim()) {
      return <span className="text-slate-500">Sin información registrada.</span>;
    }
    
    // Simple logic: if text contains a process ID or name, make it a link
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      const match = processes.find((p) => p.id === word || p.title === word);
      if (match && match.id !== selectedProcess?.id) {
        return (
          <button
            key={i}
            onClick={() => setSelectedProcessId(match.id)}
            className="text-primary hover:underline font-semibold"
          >
            {word}
          </button>
        );
      }
      return word;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-lg font-medium text-slate-300">Sincronizando con Supabase...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <AlertTriangle className="w-8 h-8 mb-4" />
        <p className="text-lg font-medium">No se pudieron cargar los procesos SGC.</p>
        <p className="text-sm text-slate-400 mt-2">Verifica permisos y estado de tablas SGC en Supabase.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar List */}
      <Card className="w-full lg:w-80 bg-slate-900/80 border-slate-700/50 backdrop-blur-md flex flex-col overflow-hidden shadow-xl">
        <CardHeader className="p-4 pb-2 border-b border-slate-800/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-outfit text-white">Mapa de Procesos</CardTitle>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              className="pl-9 bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-400 focus-visible:ring-primary/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 px-3 pb-4">
          <div className="space-y-1 py-3">
            {filteredProcesses.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProcessId(p.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all group border relative overflow-hidden",
                  selectedProcess?.id === p.id 
                    ? "bg-primary/10 border-primary/30 text-primary shadow-sm" 
                    : "bg-transparent border-transparent hover:bg-slate-800/40 hover:border-slate-700/50 text-slate-400 hover:text-slate-200"
                )}
              >
                {selectedProcess?.id === p.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                )}
                <div className={cn(
                  "p-2.5 rounded-lg transition-all duration-300",
                  selectedProcess?.id === p.id 
                    ? "bg-primary text-white shadow-md scale-110" 
                    : "bg-slate-800/80 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300"
                )}>
                  <Workflow className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-bold truncate transition-colors", 
                    selectedProcess?.id === p.id ? "text-primary" : "text-slate-200"
                  )}>
                    {p.title ?? "Proceso sin título"}
                  </p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest transition-colors mt-0.5", 
                    selectedProcess?.id === p.id ? "text-primary/70" : "text-slate-500 group-hover:text-slate-400"
                  )}>
                    {p.responsible_area || 'SGC'}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 shrink-0 transition-all duration-300",
                  selectedProcess?.id === p.id ? "translate-x-1 text-primary opacity-100" : "opacity-0 -translate-x-2"
                )} />
              </button>
            ))}
            {filteredProcesses.length === 0 && (
              <p className="text-center text-slate-400 text-sm mt-6 font-medium">No se encontraron procesos</p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Process Detail View */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {selectedProcess ? (
          <ScrollArea className="flex-1">
            <div className="space-y-6 pr-4 pb-12">
              {/* Header Card */}
              <Card className="bg-slate-900/80 border-slate-700 border-l-4 border-l-primary backdrop-blur-md shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 flex gap-2">
                  <Button size="sm" variant="outline" className="bg-slate-950/50 border-slate-700 text-slate-300 hover:text-white">
                    <Edit className="w-3.5 h-3.5 mr-2" /> Editar
                  </Button>
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-primary border-primary bg-primary/10 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">
                        {selectedProcess.id}
                      </Badge>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/50 bg-emerald-500/10 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {selectedProcess.responsible_area || 'Corporativo'}
                      </Badge>
                      <Badge variant="outline" className="text-slate-400 border-slate-700 bg-slate-800/50 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 flex items-center gap-1">
                        <History className="w-3 h-3" /> v{selectedProcess.version || '1.0'}
                      </Badge>
                    </div>
                    <h2 className="text-3xl font-bold text-white font-outfit tracking-tight">
                      {selectedProcess.title ?? "Proceso sin título"}
                    </h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-3xl">
                      Mapa detallado de interacciones, riesgos y métricas del sistema. Datos sincronizados dinámicamente.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Data Cards for KPIs and Risks */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Card className="bg-slate-900/60 border-slate-700 hover:border-primary/40 transition-all shadow-md">
                  <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/15 text-primary shadow-sm">
                        <Activity className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Métricas (KPIs)</CardTitle>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400 hover:text-white">
                      Gestionar
                    </Button>
                  </CardHeader>
                  <CardContent className="p-5">
                    {processKpis.length > 0 ? (
                      <div className="space-y-4">
                        {processKpis.map(kpi => (
                          <div key={kpi.id} className="bg-slate-950/80 p-4 rounded-lg border border-slate-700 shadow-sm">
                            <p className="text-sm font-semibold text-slate-100 mb-3">{kpi.metric_name ?? "Métrica sin nombre"}</p>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                              <span className="flex items-center gap-1.5 text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md">
                                <Target className="w-3.5 h-3.5 text-slate-400" /> Meta: <span className="text-white">{kpi.target_value ?? "N/D"}</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-slate-300 bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Actual: <span className="text-white">{kpi.current_value ?? "N/D"}</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 font-medium py-2">Sin métricas registradas en el sistema.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/60 border-slate-700 hover:border-amber-500/40 transition-all shadow-md">
                  <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-amber-500/15 text-amber-500 shadow-sm">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Riesgos (AMEF)</CardTitle>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400 hover:text-white">
                      Gestionar
                    </Button>
                  </CardHeader>
                  <CardContent className="p-5">
                    {processRisks.length > 0 ? (
                      <div className="space-y-4">
                        {processRisks.map(risk => (
                          <div key={risk.id} className="bg-slate-950/80 p-4 rounded-lg border border-slate-700 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                              <p className="text-sm font-semibold text-slate-100 pr-2">{risk.risk_name ?? "Riesgo sin descripción"}</p>
                              <Badge variant="outline" className={cn(
                                "text-[10px] font-bold uppercase px-2 py-0.5 whitespace-nowrap self-start",
                                risk.severity === 'Crítica' ? "text-red-400 border-red-500/50 bg-red-500/10" : "text-amber-400 border-amber-500/50 bg-amber-500/10"
                              )}>
                                {risk.severity ?? "Sin severidad"}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-slate-500 font-semibold block mb-1">Plan de Mitigación:</span>
                              {risk.mitigation_plan ?? "Sin plan definido"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 font-medium py-2">Sin riesgos identificados.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Improvements */}
              <Card className="bg-slate-900/60 border-slate-700 shadow-md">
                <CardContent className="p-5 flex flex-col sm:flex-row items-start gap-4">
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 shadow-sm">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <div className="flex-1 w-full">
                    <p className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">Oportunidades de Mejora</p>
                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                        {selectedProcess.improvements ?? "Sin oportunidades registradas."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900/50 border-slate-700 shadow-sm flex flex-col">
                  <CardHeader className="p-4 border-b border-slate-800/50">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200 uppercase tracking-widest">
                      <Users className="w-4 h-4 text-primary" /> Actores Implicados
                    </h3>
                  </CardHeader>
                  <CardContent className="p-4 flex-1">
                    <div className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800 h-full">
                      {renderIntelligentLinks(selectedProcess.actors)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700 shadow-sm flex flex-col">
                  <CardHeader className="p-4 border-b border-slate-800/50">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200 uppercase tracking-widest">
                      <ArrowRightLeft className="w-4 h-4 text-primary" /> Entradas y Salidas
                    </h3>
                  </CardHeader>
                  <CardContent className="p-4 flex-1">
                    <div className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800 whitespace-pre-line h-full">
                      {renderIntelligentLinks(selectedProcess.inputs_outputs)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700 shadow-sm flex flex-col">
                  <CardHeader className="p-4 border-b border-slate-800/50">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200 uppercase tracking-widest">
                      <HardDrive className="w-4 h-4 text-primary" /> Recursos Necesarios
                    </h3>
                  </CardHeader>
                  <CardContent className="p-4 flex-1">
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800 whitespace-pre-line h-full">
                      {selectedProcess.resources ?? "Sin recursos registrados."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700 shadow-sm flex flex-col">
                  <CardHeader className="p-4 border-b border-slate-800/50">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200 uppercase tracking-widest">
                      <FileText className="w-4 h-4 text-primary" /> Documentación Relacionada
                    </h3>
                  </CardHeader>
                  <CardContent className="p-4 flex-1">
                    <div className="space-y-2">
                      {(selectedProcess.documents ?? "")
                        .split('\n')
                        .map((doc) => doc.trim())
                        .filter(Boolean)
                        .map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-lg hover:border-primary/30 transition-colors group">
                            <span className="text-sm text-slate-300 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-500 group-hover:text-primary" /> {doc}
                            </span>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-primary">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      {!(selectedProcess.documents ?? "").trim() && (
                        <p className="text-sm text-slate-400">Sin documentación relacionada.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Diagram Section */}
              <section className="space-y-4 pt-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-slate-700 pb-3">
                  <Workflow className="w-5 h-5 text-primary" /> Diagrama de Flujo
                </h3>
                <Card className="bg-slate-950/80 border-slate-700 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                  <div className="p-8 text-center space-y-4 w-full">
                    <Workflow className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
                    <div className="space-y-2 w-full max-w-4xl mx-auto">
                      <p className="text-slate-300 text-sm font-mono whitespace-pre text-left bg-slate-900 p-5 rounded-lg border border-slate-700 overflow-auto max-h-64 shadow-sm leading-relaxed">
                        {selectedProcess.mermaid_code ?? "Sin diagrama registrado."}
                      </p>
                      <p className="text-xs text-slate-500 italic mt-3 font-medium">
                        (Diagrama renderizado vía Mermaid.js)
                      </p>
                    </div>
                  </div>
                </Card>
              </section>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed m-4">
            <Workflow className="w-16 h-16 mb-4 opacity-30 text-slate-500" />
            <p className="text-lg font-medium text-slate-300">Selecciona un proceso</p>
            <p className="text-sm text-slate-500 mt-2">Los detalles sincronizados aparecerán aquí.</p>
          </div>
        )}
      </div>
    </div>
  );
}
