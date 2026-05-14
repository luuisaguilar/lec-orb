"use client";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import { LayoutGrid, List } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmKanbanBoard, CrmOpportunity, CrmOpportunityStage } from "./crm-kanban-board";
import CrmPipelineTable from "./crm-pipeline-table";
import { Skeleton } from "@/components/ui/skeleton";
import AddProspectDialog from "./add-prospect-dialog";

async function crmOpportunitiesFetcher(url: string) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Error al cargar oportunidades");
  }
  return body;
}

export default function CrmPipeline() {
  const { data, error, isLoading, mutate } = useSWR<{ opportunities: CrmOpportunity[] }>(
    "/api/v1/crm/opportunities",
    crmOpportunitiesFetcher
  );
  const [view, setView] = useState<"kanban" | "table">("kanban");

  const opportunities = data?.opportunities || [];

  const handleMoveOpportunity = async (id: string, newStage: CrmOpportunityStage) => {
    // Optimistic update
    mutate((current) => {
      if (!current) return current;
      return {
        ...current,
        opportunities: current.opportunities.map((o) => (o.id === id ? { ...o, stage: newStage } : o)),
      };
    }, false);

    try {
      const res = await fetch(`/api/v1/crm/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) {
        throw new Error("Error actualizando la etapa.");
      }
      toast.success("Oportunidad movida exitosamente.");
    } catch (e: any) {
      toast.error(e.message || "Error al mover la oportunidad");
      mutate(); // Revert on failure
    }
  };

  const handleEditOpportunity = (opp: CrmOpportunity) => {
    // To be implemented in next ticket (forms)
    toast.info(`Editar oportunidad: ${opp.title}`);
  };

  return (
    <Card className="border-indigo-500/20 shadow-lg shadow-indigo-500/5 bg-background/60 backdrop-blur-sm border-0">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "table")} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2 bg-indigo-950/40 border border-indigo-500/20">
                <TabsTrigger value="kanban" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="table" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <List className="w-4 h-4 mr-2" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <AddProspectDialog />
        </div>
      </CardHeader>
      <CardContent className="pt-4 overflow-hidden px-2 md:px-6 pb-6">
        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[400px] w-[260px] rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">Error al cargar las oportunidades.</div>
        ) : (
          <>
            {view === "kanban" ? (
              <CrmKanbanBoard 
                opportunities={opportunities} 
                onMoveOpportunity={handleMoveOpportunity}
                onEditOpportunity={handleEditOpportunity}
              />
            ) : (
              <CrmPipelineTable 
                opportunities={opportunities} 
                onMoveOpportunity={handleMoveOpportunity}
                onEditOpportunity={handleEditOpportunity}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
