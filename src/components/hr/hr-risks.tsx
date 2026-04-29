"use client";

import { RISK_MATRIX, RiskItem } from "@/lib/data/hr";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HRRisks() {
  const getStatusColor = (status: RiskItem['status']) => {
    switch (status) {
      case 'Abierto': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'En Proceso': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Mitigado': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getNPRColor = (npr: number) => {
    if (npr >= 100) return "text-red-500 font-bold";
    if (npr >= 50) return "text-yellow-500 font-bold";
    return "text-green-500 font-bold";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Riesgos Críticos</p>
              <p className="text-2xl font-bold text-white">
                {RISK_MATRIX.filter(r => r.npr >= 50).length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">En Mitigación</p>
              <p className="text-2xl font-bold text-white">
                {RISK_MATRIX.filter(r => r.status === 'En Proceso').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Mitigados</p>
              <p className="text-2xl font-bold text-white">
                {RISK_MATRIX.filter(r => r.status === 'Mitigado').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-outfit text-white">Matriz AMEF (Análisis de Modo y Efecto de Falla)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 font-bold">Riesgo / Falla</TableHead>
                <TableHead className="text-slate-400 font-bold">Causa / Efecto</TableHead>
                <TableHead className="text-center text-slate-400 font-bold">S</TableHead>
                <TableHead className="text-center text-slate-400 font-bold">O</TableHead>
                <TableHead className="text-center text-slate-400 font-bold">D</TableHead>
                <TableHead className="text-center text-slate-400 font-bold">NPR</TableHead>
                <TableHead className="text-slate-400 font-bold">Acción Preventiva</TableHead>
                <TableHead className="text-slate-400 font-bold">Estatus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RISK_MATRIX.map((risk) => (
                <TableRow key={risk.id} className="border-slate-800 hover:bg-slate-800/20 transition-colors">
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{risk.risk}</span>
                      <span className="text-[10px] text-primary uppercase">{risk.processId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px] text-xs text-slate-400">
                    <p><strong className="text-slate-300">Causa:</strong> {risk.cause}</p>
                    <p><strong className="text-slate-300">Efecto:</strong> {risk.effect}</p>
                  </TableCell>
                  <TableCell className="text-center text-slate-300">{risk.s}</TableCell>
                  <TableCell className="text-center text-slate-300">{risk.o}</TableCell>
                  <TableCell className="text-center text-slate-300">{risk.d}</TableCell>
                  <TableCell className={cn("text-center text-lg", getNPRColor(risk.npr))}>
                    {risk.npr}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-xs text-slate-300">
                    {risk.action}
                    <div className="mt-1 text-[10px] text-slate-500 italic">Resp: {risk.owner}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("whitespace-nowrap", getStatusColor(risk.status))}>
                      {risk.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex gap-4 text-[10px] text-slate-500 uppercase tracking-widest justify-center">
        <span>S: Severidad</span>
        <span>•</span>
        <span>O: Ocurrencia</span>
        <span>•</span>
        <span>D: Detección</span>
        <span>•</span>
        <span>NPR: Nivel de Prioridad de Riesgo</span>
      </div>
    </div>
  );
}
