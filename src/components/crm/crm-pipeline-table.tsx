"use client";

import { CrmOpportunity, CrmOpportunityStage } from "./crm-kanban-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, PanelRightOpen, TrendingUp } from "lucide-react";

const STAGE_CONFIG: Record<CrmOpportunityStage, { name: string; color: string }> = {
  new: { name: "Nuevo", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  qualified: { name: "Calificado", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  proposal: { name: "Propuesta", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  negotiation: { name: "Negociación", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  won: { name: "Ganado", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  lost: { name: "Perdido", color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

export default function CrmPipelineTable({
  opportunities,
  onOpenOpportunityDetail,
}: {
  opportunities: CrmOpportunity[];
  onMoveOpportunity: (id: string, stage: CrmOpportunityStage) => void;
  onOpenOpportunityDetail: (opp: CrmOpportunity) => void;
}) {
  return (
    <div className="rounded-xl border border-indigo-500/10 overflow-hidden bg-card/50">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
          <tr>
            <th className="px-4 py-3">Cliente / Servicio</th>
            <th className="px-4 py-3">Etapa</th>
            <th className="px-4 py-3">Valor Estimado</th>
            <th className="px-4 py-3">Cierre Esperado</th>
            <th className="px-4 py-3 w-[100px] text-right">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-indigo-500/10">
          {opportunities.map((opp) => {
            const stageConf = STAGE_CONFIG[opp.stage] || STAGE_CONFIG.new;

            return (
              <tr key={opp.id} className="hover:bg-indigo-500/5 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    {opp.contact_name && (
                      <span className="font-semibold text-foreground group-hover:text-indigo-400 transition-colors">
                        {opp.contact_name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{opp.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`border ${stageConf.color} whitespace-nowrap`}>
                    {stageConf.name}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-emerald-400">{formatCurrency(opp.expected_amount)}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    {opp.probability}% prob.
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {opp.expected_close ? (
                    <span className="flex items-center text-xs">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {opp.expected_close}
                    </span>
                  ) : (
                    <span className="text-xs italic opacity-50">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-indigo-400 hover:text-indigo-300"
                    aria-label="Ver detalle"
                    onClick={() => onOpenOpportunityDetail(opp)}
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
          {opportunities.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                No hay oportunidades registradas en el pipeline.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
