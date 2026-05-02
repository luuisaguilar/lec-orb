"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type AuditStatus = "pending" | "cumple" | "noconf" | "oport";

type AuditItem = {
  id: string;
  clause_id: string;
  title: string;
  question: string;
  status: AuditStatus;
  notes: string | null;
  tags: string[];
  sort_order: number;
  next_audit_date: string | null;
  updated_at: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusStyles: Record<AuditStatus, string> = {
  pending: "bg-slate-800 text-slate-400 border-slate-700",
  cumple: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  noconf: "bg-red-500/15 text-red-400 border-red-500/30",
  oport: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const statusLabel: Record<AuditStatus, string> = {
  pending: "Pendiente",
  cumple: "Cumple",
  noconf: "No conformidad",
  oport: "Oportunidad",
};

export default function SGCAudit() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useSWR("/api/v1/sgc/audit", fetcher);
  const items = useMemo<AuditItem[]>(() => (data?.items ?? []) as AuditItem[], [data?.items]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.clause_id.includes(search)) &&
          (!filter || item.tags.includes(filter))
      ),
    [items, search, filter]
  );

  const stats = useMemo(() => {
    const total = items.length || 1;
    const cumple = items.filter((i) => i.status === "cumple").length;
    const hallazgos = items.filter((i) => i.status === "noconf").length;
    const nextAudit = items
      .map((i) => i.next_audit_date)
      .filter(Boolean)
      .sort()[0];

    return {
      cumplimiento: Math.round((cumple / total) * 100),
      hallazgos,
      proxima: nextAudit ?? "Sin fecha",
    };
  }, [items]);

  async function updateStatus(itemId: string, status: AuditStatus) {
    setIsSaving(itemId);
    try {
      const response = await fetch(`/api/v1/sgc/audit/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("No se pudo actualizar el estado");
      await mutate();
    } finally {
      setIsSaving(null);
    }
  }

  if (isLoading) {
    return (
      <div className="h-[480px] flex items-center justify-center text-slate-300">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando auditoria SGC...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[480px] flex items-center justify-center text-red-400">
        No se pudieron cargar los datos de auditoria.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar clausula o requisito..."
            className="pl-10 bg-slate-900/50 border-slate-800 focus:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn("border-slate-800", filter === "ISO 9001" && "bg-primary/20 border-primary/50 text-primary")}
            onClick={() => setFilter(filter === "ISO 9001" ? null : "ISO 9001")}
          >
            ISO 9001
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("border-slate-800", filter === "ISO 21001" && "bg-emerald-500/20 border-emerald-500/50 text-emerald-400")}
            onClick={() => setFilter(filter === "ISO 21001" ? null : "ISO 21001")}
          >
            ISO 21001
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AuditStatCard icon={<CheckCircle2 className="text-emerald-400" />} label="Cumplimiento Global" value={`${stats.cumplimiento}%`} color="text-emerald-400" />
        <AuditStatCard icon={<AlertCircle className="text-red-400" />} label="Hallazgos Abiertos" value={`${stats.hallazgos}`} color="text-red-400" />
        <AuditStatCard icon={<Clock className="text-amber-400" />} label="Próxima Auditoría" value={stats.proxima} color="text-amber-400" />
      </div>

      <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-950/30 border-b border-slate-800/50 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" /> Lista de Verificación
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-800">
              {filteredItems.length} requisitos mostrados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/20 border-b border-slate-800/50">
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20 text-center">ID</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Punto de Norma / Requisito</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36 text-center">Estado</th>
                  <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/30 hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-center">
                      <Badge variant="secondary" className="bg-slate-800 text-slate-400 border-none font-mono text-[10px]">
                        {item.clause_id}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-white">{item.title}</span>
                        <p className="text-xs text-slate-400 leading-tight">{item.question}</p>
                        <div className="flex gap-1.5 mt-2">
                          {item.tags.map((tag) => (
                            <Badge
                              key={`${item.id}-${tag}`}
                              className={cn(
                                "text-[8px] px-1.5 py-0 h-4 border-none",
                                tag === "ISO 9001" ? "bg-primary/20 text-primary" : "bg-emerald-500/20 text-emerald-400"
                              )}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={cn("text-[10px] border", statusStyles[item.status])}>
                        {statusLabel[item.status]}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-400 hover:bg-emerald-400/10"
                          disabled={isSaving === item.id}
                          onClick={() => updateStatus(item.id, "cumple")}
                        >
                          {isSaving === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:bg-red-400/10"
                          disabled={isSaving === item.id}
                          onClick={() => updateStatus(item.id, "noconf")}
                        >
                          {isSaving === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        </Button>
                      </div>
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

function AuditStatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden relative group">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-slate-950 shadow-inner group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
            <h4 className={cn("text-3xl font-bold font-outfit mt-1", color)}>{value}</h4>
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-20" />
    </Card>
  );
}
