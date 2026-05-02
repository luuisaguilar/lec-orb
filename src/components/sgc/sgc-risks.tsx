"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { AlertTriangle, TrendingUp, ShieldAlert, FileWarning, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type RiskRow = {
  id: string;
  process_id: string | null;
  process_title: string;
  risk_name: string;
  severity: string | null;
  probability: string | null;
  mitigation_plan: string | null;
  status: string | null;
  updated_at: string | null;
};

type RiskView = RiskRow & {
  sev: number;
  occ: number;
  det: number;
  npr: number;
  statusUi: "critical" | "mitigating" | "controlled";
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function levelToScore(value: string | null, type: "severity" | "probability"): number {
  if (!value) return 3;
  const raw = value.toLowerCase();
  const numeric = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (!Number.isNaN(numeric)) return Math.max(1, Math.min(10, numeric));

  if (type === "severity") {
    if (raw.includes("crit")) return 10;
    if (raw.includes("alta")) return 8;
    if (raw.includes("media")) return 5;
    if (raw.includes("baja")) return 2;
    return 4;
  }

  if (raw.includes("alta")) return 8;
  if (raw.includes("media")) return 5;
  if (raw.includes("baja")) return 2;
  return 4;
}

function statusToDetection(status: string | null): number {
  const raw = (status ?? "").toLowerCase();
  if (raw.includes("control")) return 2;
  if (raw.includes("mitig")) return 3;
  if (raw.includes("activ")) return 5;
  return 4;
}

function statusToUi(status: string | null): "critical" | "mitigating" | "controlled" {
  const raw = (status ?? "").toLowerCase();
  if (raw.includes("control")) return "controlled";
  if (raw.includes("mitig")) return "mitigating";
  return "critical";
}

export default function SGCRisks() {
  const { data, isLoading, error } = useSWR("/api/v1/sgc/risks", fetcher);
  const risks = useMemo<RiskRow[]>(() => (data?.risks ?? []) as RiskRow[], [data?.risks]);

  const riskRows = useMemo<RiskView[]>(
    () =>
      risks.map((risk) => {
        const sev = levelToScore(risk.severity, "severity");
        const occ = levelToScore(risk.probability, "probability");
        const det = statusToDetection(risk.status);
        return {
          ...risk,
          sev,
          occ,
          det,
          npr: sev * occ * det,
          statusUi: statusToUi(risk.status),
        };
      }),
    [risks]
  );

  const stats = useMemo(() => {
    if (!riskRows.length) return { avg: 0, critical: 0, active: 0 };
    const total = riskRows.reduce((sum, r) => sum + r.npr, 0);
    return {
      avg: Math.round(total / riskRows.length),
      critical: riskRows.filter((r) => r.npr > 200).length,
      active: riskRows.filter((r) => r.statusUi !== "controlled").length,
    };
  }, [riskRows]);

  if (isLoading) {
    return (
      <div className="h-[480px] flex items-center justify-center text-slate-300">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando riesgos SGC...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[480px] flex items-center justify-center text-red-400">
        No se pudieron cargar los riesgos SGC.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <RiskStatCard label="Nivel de Riesgo Promedio" value={`${stats.avg}`} icon={<TrendingUp className="text-primary" />} />
        <RiskStatCard label="Puntos Críticos (NPR > 200)" value={`${stats.critical}`} icon={<ShieldAlert className="text-red-500" />} />
        <RiskStatCard label="Mitigaciones Activas" value={`${stats.active}`} icon={<FileWarning className="text-emerald-400" />} />
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" className="h-10 border-slate-800 text-slate-400">
            <Download className="w-3.5 h-3.5 mr-2" /> Exportar Matriz
          </Button>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-800/50">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Matriz de Riesgos AMEF
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/20 border-b border-slate-800/50">
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proceso</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Falla / Riesgo</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">S</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">O</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">D</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">NPR</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {riskRows.map((risk) => (
                  <tr key={risk.id} className="border-b border-slate-800/30 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700 text-[10px]">
                        {risk.process_title}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{risk.risk_name}</span>
                        <span className="text-xs text-slate-400 italic">Mitigación: {risk.mitigation_plan || "Sin plan definido"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm font-mono text-slate-400">{risk.sev}</td>
                    <td className="p-4 text-center text-sm font-mono text-slate-400">{risk.occ}</td>
                    <td className="p-4 text-center text-sm font-mono text-slate-400">{risk.det}</td>
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          "text-sm font-black px-2 py-0.5 rounded-lg font-mono",
                          risk.npr > 200 ? "bg-red-500/20 text-red-500" :
                          risk.npr > 100 ? "bg-amber-500/20 text-amber-500" :
                          "bg-emerald-500/20 text-emerald-500"
                        )}
                      >
                        {risk.npr}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Badge
                        className={cn(
                          "text-[9px] uppercase tracking-tighter",
                          risk.statusUi === "critical" ? "bg-red-500 text-white" :
                          risk.statusUi === "mitigating" ? "bg-amber-500 text-black" :
                          "bg-emerald-600 text-white"
                        )}
                      >
                        {risk.statusUi === "critical" ? "Crítico" : risk.statusUi === "mitigating" ? "En Mitigación" : "Controlado"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskStatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="bg-slate-900/80 border-slate-800">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-slate-950 shadow-inner">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{label}</p>
          <h4 className="text-xl font-bold text-white mt-0.5">{value}</h4>
        </div>
      </CardContent>
    </Card>
  );
}
