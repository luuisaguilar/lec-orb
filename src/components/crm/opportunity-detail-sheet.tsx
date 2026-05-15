"use client";

import useSWR from "swr";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, Calendar, FileText, Phone, User } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { CrmOpportunityStage } from "./crm-kanban-board";

const STAGE_LABELS: Record<CrmOpportunityStage, string> = {
  new: "Nuevo",
  qualified: "Calificado",
  proposal: "Propuesta",
  negotiation: "Negociación",
  won: "Ganado",
  lost: "Perdido",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Llamada",
  email: "Correo",
  meeting: "Reunión",
  task: "Tarea",
  whatsapp: "WhatsApp",
  note: "Nota",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  done: "Hecha",
  cancelled: "Cancelada",
};

type CrmContactEmbed = {
  id: string;
  name: string;
  type: string;
  email?: string | null;
  phone?: string | null;
};

export type OpportunityDetail = {
  id: string;
  title: string;
  stage: string;
  expected_amount: number;
  probability: number;
  expected_close: string | null;
  loss_reason?: string | null;
  notes?: string | null;
  quote_id?: string | null;
  assigned_to?: string | null;
  created_at: string;
  crm_contacts?: CrmContactEmbed | null;
};

type ActivityRow = {
  id: string;
  type: string;
  subject: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

async function opportunityDetailFetcher(url: string) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Error al cargar la oportunidad");
  }
  return body as { opportunity: OpportunityDetail; activities: ActivityRow[] };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function stageBadgeClass(stage: string) {
  const s = stage as CrmOpportunityStage;
  const map: Partial<Record<CrmOpportunityStage, string>> = {
    new: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
    qualified: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10",
    proposal: "border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10",
    negotiation: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    won: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    lost: "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10",
  };
  return map[s] ?? "border-muted bg-muted/40";
}

type OpportunityDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string | null;
};

/**
 * MS1: panel lateral solo lectura (detalle + actividades). MS2: edición PATCH. MS3: eliminar.
 */
export function OpportunityDetailSheet({ open, onOpenChange, opportunityId }: OpportunityDetailSheetProps) {
  const swrKey = open && opportunityId ? `/api/v1/crm/opportunities/${opportunityId}` : null;
  const { data, error, isLoading } = useSWR(swrKey, opportunityDetailFetcher);

  const opp = data?.opportunity;
  const activities = data?.activities ?? [];
  const stageLabel =
    (STAGE_LABELS[opp?.stage as CrmOpportunityStage] ?? opp?.stage ?? "—") as string;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton
        className={cn(
          "border-indigo-500/20 bg-background/95 backdrop-blur-md",
          "flex w-full flex-col p-0 sm:max-w-xl"
        )}
      >
        <SheetHeader className="border-b border-indigo-500/10 px-6 py-4 text-left shrink-0">
          <SheetTitle className="font-outfit text-xl text-indigo-400 pr-8">Detalle de oportunidad</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Vista previa (MS1). En MS2 podrás editar y guardar desde aquí.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <div className="space-y-4 px-6 py-4">
              <Skeleton className="h-8 w-[80%] max-w-full rounded-md" />
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="px-6 py-6 text-sm text-destructive">
              {error instanceof Error ? error.message : "No se pudo cargar."}
            </div>
          ) : opp ? (
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-4 pr-3">
                <div>
                  <h2 className="text-lg font-semibold leading-snug text-foreground">{opp.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs", stageBadgeClass(opp.stage))}>
                      {stageLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Creada {format(new Date(opp.created_at), "PP", { locale: es })}
                    </span>
                  </div>
                </div>

                {opp.crm_contacts ? (
                  <section className="rounded-xl border border-indigo-500/15 bg-card/40 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Contacto
                    </h3>
                    <p className="font-medium text-foreground">{opp.crm_contacts.name}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">{opp.crm_contacts.type}</p>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {opp.crm_contacts.email ? (
                        <p className="flex items-center gap-2">
                          <FileText className="h-3 w-3 shrink-0 opacity-70" />
                          {opp.crm_contacts.email}
                        </p>
                      ) : null}
                      {opp.crm_contacts.phone ? (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3 w-3 shrink-0 opacity-70" />
                          {opp.crm_contacts.phone}
                        </p>
                      ) : null}
                    </div>
                    <Button variant="link" className="mt-2 h-auto px-0 text-indigo-400" asChild>
                      <Link href="/dashboard/crm/directorio">Ir al directorio</Link>
                    </Button>
                  </section>
                ) : null}

                <section className="rounded-xl border border-indigo-500/15 bg-card/40 p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    Resumen comercial
                  </h3>
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Valor estimado</dt>
                      <dd className="font-semibold text-emerald-500">{formatCurrency(Number(opp.expected_amount))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Probabilidad</dt>
                      <dd className="font-medium">{opp.probability}%</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Cierre esperado</dt>
                      <dd className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {opp.expected_close
                          ? format(new Date(opp.expected_close + "T12:00:00"), "PP", { locale: es })
                          : "—"}
                      </dd>
                    </div>
                    {opp.quote_id ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">Cotización (ID)</dt>
                        <dd className="font-mono text-xs break-all">{opp.quote_id}</dd>
                      </div>
                    ) : null}
                    {opp.assigned_to ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">Asignado a (usuario)</dt>
                        <dd className="font-mono text-xs break-all">{opp.assigned_to}</dd>
                      </div>
                    ) : null}
                    {opp.loss_reason ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">Motivo de pérdida</dt>
                        <dd className="text-sm">{opp.loss_reason}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {opp.notes ? (
                    <div className="mt-4 border-t border-indigo-500/10 pt-3">
                      <dt className="text-xs font-medium text-muted-foreground">Notas</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{opp.notes}</dd>
                    </div>
                  ) : null}
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actividades recientes
                  </h3>
                  {activities.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-indigo-500/20 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                      Sin actividades vinculadas a esta oportunidad.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {activities.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-lg border border-indigo-500/10 bg-card/50 px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{a.subject}</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-[10px]">
                                {ACTIVITY_TYPE_LABELS[a.type] ?? a.type}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {STATUS_LABELS[a.status] ?? a.status}
                              </Badge>
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {a.due_date
                              ? `Vence: ${format(new Date(a.due_date), "PP p", { locale: es })}`
                              : `Registrada: ${format(new Date(a.created_at), "PP p", { locale: es })}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </ScrollArea>
          ) : null}
        </div>

        <SheetFooter className="border-t border-indigo-500/10 px-6 py-4 shrink-0">
          <Button type="button" variant="outline" className="w-full border-indigo-500/20 sm:w-auto" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
