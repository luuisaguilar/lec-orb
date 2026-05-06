"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Zap, 
  ArrowUpRight,
  Target,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SGCCarTracker from "./sgc-car-tracker";

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error("Error cargando metricas");
  return r.json();
});

export default function SGCDashboard() {
  const { data, isLoading, error } = useSWR("/api/v1/sgc/stats", fetcher);

  const stats = data?.summary || {
    totalNc: 0,
    openNc: 0,
    avgLeadTime: 0,
    capaCompliance: 0,
    capaOnTimeRate: 0,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">Calculando indicadores clave...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-rose-500/5 border border-rose-500/20 rounded-2xl max-w-md">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error al cargar métricas</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Lead Time NC" 
          value={`${stats.avgLeadTime} dias`} 
          description="Tiempo promedio de cierre"
          icon={<Clock className="h-4 w-4" />}
          trend="+5% vs mes anterior"
          trendType="down"
          color="blue"
        />
        <MetricCard 
          title="Cumplimiento CAPA" 
          value={`${stats.capaCompliance}%`} 
          description="Acciones cerradas vs total"
          icon={<CheckCircle2 className="h-4 w-4" />}
          trend="Estable"
          color="emerald"
        />
        <MetricCard 
          title="NCs Abiertas" 
          value={stats.openNc.toString()} 
          description="Requieren atención inmediata"
          icon={<AlertCircle className="h-4 w-4" />}
          trend={`${stats.totalNc} totales`}
          color="rose"
        />
        <MetricCard 
          title="Eficacia On-Time" 
          value={`${stats.capaOnTimeRate}%`} 
          description="Cierres antes del deadline"
          icon={<Target className="h-4 w-4" />}
          color="primary"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40 backdrop-blur-md overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-32 w-32" />
          </div>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
              Distribución por Severidad
            </CardTitle>
            <CardDescription className="text-xs">
              Impacto de las no conformidades registradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {Object.entries(data?.ncBySeverity || {}).length === 0 ? (
               <p className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm italic">Sin datos de severidad</p>
             ) : (
               Object.entries(data?.ncBySeverity || {}).map(([key, count]: [string, any]) => (
                 <div key={key} className="space-y-1.5">
                   <div className="flex justify-between text-xs">
                     <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">{key}</span>
                     <span className="text-slate-500 dark:text-slate-400">{count} NCs</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                     <div 
                        className={cn(
                          "h-full bg-primary transition-all duration-1000",
                          key.includes('high') || key.includes('critica') ? "bg-rose-500" : "bg-primary"
                        )} 
                        style={{ width: `${(count / stats.totalNc) * 100}%` }} 
                      />
                   </div>
                 </div>
               ))
             )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40 backdrop-blur-md overflow-hidden relative group">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
              Estatus General CAPA
            </CardTitle>
            <CardDescription className="text-xs">
              Progreso de acciones correctivas y preventivas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around py-4">
               <StatusCircle label="Cerradas" value={data?.capas?.completed || 0} color="emerald" total={data?.capas?.total} />
               <StatusCircle label="Pendientes" value={data?.capas?.pending || 0} color="amber" total={data?.capas?.total} />
            </div>
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-200 dark:border-slate-800/50">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">Riesgos Críticos:</span>
                  </div>
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">
                    {data?.risks?.critical || 0} Hallazgos
                  </Badge>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <SGCCarTracker />

      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
              Insights del Sistema
            </CardTitle>
            <CardDescription className="text-xs">
              Recomendaciones automáticas basadas en datos.
            </CardDescription>
           </div>
           <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <InsightItem 
            title="Reducción de Lead Time"
            content="El tiempo promedio de cierre bajó 2 días este mes. Buen seguimiento."
            type="success"
          />
          <InsightItem 
            title="Alerta de Vencimiento"
            content="3 acciones CAPA vencen en las próximas 48 horas. Notificar a responsables."
            type="warning"
          />
          <InsightItem 
            title="Foco en Procesos"
            content="El 40% de las NCs provienen del área de Logística. Revisar procedimientos."
            type="info"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, description, icon, trend, trendType = 'up', color }: any) {
  const colors: any = {
    primary: "from-primary/20 to-transparent border-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]",
    rose: "from-rose-500/20 to-transparent border-rose-500/20 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]",
    emerald: "from-emerald-500/20 to-transparent border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
    blue: "from-blue-500/20 to-transparent border-blue-500/20 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
  };

  return (
    <Card className={cn("bg-white dark:bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 backdrop-blur-sm relative overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-xl group")}>
      <div className={cn("absolute inset-0 bg-linear-to-br opacity-0 group-hover:opacity-100 transition-opacity", colors[color])} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</CardTitle>
        <div className={cn("p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800", colors[color])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <Badge variant="outline" className={cn(
              "text-[9px] px-1.5 py-0 font-medium border-transparent bg-slate-50 dark:bg-slate-950/50",
              trendType === 'up' ? "text-emerald-400" : "text-rose-400"
            )}>
              {trend}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCircle({ label, value, color, total }: any) {
  const colors: any = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <div className="text-center group">
      <div className={cn(
        "h-16 w-16 rounded-full flex items-center justify-center border-2 mb-3 mx-auto transition-all group-hover:scale-110",
        colors[color]
      )}>
        <span className="text-xl font-bold">{value}</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-[9px] text-slate-600 font-medium">
        {total > 0 ? Math.round((value / total) * 100) : 0}%
      </p>
    </div>
  );
}

function InsightItem({ title, content, type }: any) {
  const config: any = {
    success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    warning: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    info: "border-blue-500/20 bg-blue-500/5 text-blue-400",
  };

  return (
    <div className={cn("p-3 rounded-lg border text-xs leading-relaxed transition-all hover:bg-opacity-10", config[type])}>
      <div className="font-bold flex items-center gap-2 mb-1">
        <ArrowUpRight className="h-3 w-3" /> {title}
      </div>
      <p className="opacity-80">{content}</p>
    </div>
  );
}

