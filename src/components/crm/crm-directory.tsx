"use client";

import useSWR from "swr";
import { useState } from "react";
import { Search, Building2, User, Phone, Mail, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AddProspectDialog from "./add-prospect-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type CrmOpportunity = {
  id: string;
  title: string;
  stage: string;
  expected_amount: number;
  probability: number;
  created_at: string;
  crm_contacts: {
    id: string;
    name: string;
    type: 'school' | 'company' | 'individual';
    email: string | null;
    phone: string | null;
  };
};

const STAGE_CONFIG: Record<string, { label: string, color: string }> = {
  new: { label: "Nuevo", color: "border-blue-500/20 bg-blue-500/10 text-blue-500" },
  qualified: { label: "Calificado", color: "border-purple-500/20 bg-purple-500/10 text-purple-500" },
  proposal: { label: "Cotizado", color: "border-orange-500/20 bg-orange-500/10 text-orange-500" },
  negotiation: { label: "Negociación", color: "border-amber-500/20 bg-amber-500/10 text-amber-500" },
  won: { label: "Ganado", color: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" },
  lost: { label: "Perdido", color: "border-red-500/20 bg-red-500/10 text-red-500" },
};

const TYPE_CONFIG = {
  school: { icon: Building2, color: "text-blue-500 bg-blue-500/10" },
  company: { icon: Building2, color: "text-purple-500 bg-purple-500/10" },
  individual: { icon: User, color: "text-emerald-500 bg-emerald-500/10" },
};

export default function CrmDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, error, isLoading } = useSWR<{ opportunities: CrmOpportunity[], total: number }>(`/api/v1/crm/opportunities${searchTerm ? `?q=${searchTerm}` : ''}`);

  const opps = data?.opportunities || [];

  return (
    <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/5 bg-background/60 backdrop-blur-sm border-0">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-outfit text-indigo-400">Prospectos y Oportunidades</CardTitle>
            <CardDescription>
              Directorio de negocios activos, clientes e interesados en servicios.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar servicio o nombre..." 
                className="pl-9 w-[250px] bg-background/50 border-indigo-500/20 focus-visible:ring-indigo-500/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <AddProspectDialog />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted/40" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 bg-red-500/5 rounded-xl border border-red-500/10">
            Error al cargar los prospectos. Por favor intenta recargar.
          </div>
        ) : opps.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-indigo-500/20 flex flex-col items-center gap-3">
            <User className="h-10 w-10 text-indigo-500/40" />
            <p>No se encontraron prospectos.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-indigo-500/10 overflow-hidden bg-card/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Servicio de Interés</th>
                  <th className="px-4 py-3">Estatus</th>
                  <th className="px-4 py-3">Valor / Cierre</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/10">
                {opps.map((opp) => {
                  const contact = opp.crm_contacts;
                  if (!contact) return null;
                  const TypeIcon = TYPE_CONFIG[contact.type]?.icon || User;
                  const typeColor = TYPE_CONFIG[contact.type]?.color || "text-gray-500 bg-gray-500/10";
                  const stageConf = STAGE_CONFIG[opp.stage] || STAGE_CONFIG.new;

                  return (
                    <tr key={opp.id} className="hover:bg-indigo-500/5 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${typeColor}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-indigo-400 transition-colors">{contact.name}</p>
                            <div className="flex flex-col md:flex-row gap-1 text-muted-foreground text-xs">
                              {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>}
                              {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{opp.title}</span>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(opp.created_at), "dd MMM, yyyy", { locale: es })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`border ${stageConf.color}`}>
                          {stageConf.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-emerald-500">${Number(opp.expected_amount).toLocaleString("es-MX")}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {opp.stage === 'won' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3" />}
                          {opp.probability}% prob.
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
