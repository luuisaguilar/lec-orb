"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  Loader2,
  Save,
  ShieldAlert,
  User,
  XCircle,
  Plus,
  ArrowLeft,
  FileText,
  Clock,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/lib/hooks/use-user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentList, DocumentUpload } from "@/components/documents/DocumentPanel";
import { exportAuditToPdf } from "@/lib/sgc/pdf-export";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AuditStatus = "pending" | "cumple" | "noconf" | "oport";
type CarStatus = "open" | "in_progress" | "closed";

interface AuditInstance {
  id: string;
  ref: string;
  title: string;
  audit_date: string;
  state: "open" | "done";
  audit_manager_id: string | null;
  audit_manager?: { full_name: string };
  created_at: string;
  updated_at: string;
}

interface AuditItem {
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
}

interface AuditCar {
  id: string;
  audit_check_id: string;
  car_code: string;
  finding_clause_id: string;
  finding_title: string;
  description: string;
  status: CarStatus;
  root_cause: string | null;
  action_plan: string | null;
  owner_name: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface AuditTimeline {
  id: string;
  entity: "check" | "car";
  reference: string;
  title: string;
  status: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Error en la solicitud");
  return r.json();
});

function formatStatus(status: string) {
  if (status === "noconf") return "No conformidad";
  if (status === "cumple") return "Cumple";
  if (status === "oport") return "Oportunidad";
  if (status === "in_progress") return "En curso";
  if (status === "closed") return "Cerrada";
  return "Pendiente";
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditDetail Component
// ─────────────────────────────────────────────────────────────────────────────

function AuditDetail({ auditId, onBack }: { auditId: string; onBack: () => void }) {
  const [activeClause, setActiveClause] = useState("4");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [dateDraft, setDateDraft] = useState<Record<string, string>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [savingCarId, setSavingCarId] = useState<string | null>(null);

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [carRootCause, setCarRootCause] = useState("");
  const [carActionPlan, setCarActionPlan] = useState("");
  const [carOwner, setCarOwner] = useState("");
  const [carDueDate, setCarDueDate] = useState("");
  const [carStatus, setCarStatus] = useState<CarStatus>("open");

  const { data, isLoading, mutate } = useSWR(`/api/v1/sgc/audits/${auditId}`, fetcher);
  const { hasPermission } = useUser();

  const audit: AuditInstance | undefined = data?.audit;
  const items: AuditItem[] = useMemo(() => data?.audit?.checks ?? [], [data?.audit?.checks]);
  const cars: AuditCar[] = useMemo(() => data?.audit?.cars ?? [], [data?.audit?.cars]);
  const timeline: AuditTimeline[] = useMemo(() => data?.audit?.timeline ?? [], [data?.audit?.timeline]);

  const selectedCar = useMemo(() => cars.find(c => c.id === selectedCarId), [cars, selectedCarId]);

  useEffect(() => {
    if (selectedCar) {
      setCarRootCause(selectedCar.root_cause ?? "");
      setCarActionPlan(selectedCar.action_plan ?? "");
      setCarOwner(selectedCar.owner_name ?? "");
      setCarDueDate(selectedCar.due_date ?? "");
      setCarStatus(selectedCar.status);
    }
  }, [selectedCar]);

  const clauseGroups = useMemo(() => {
    const groups = Array.from(
      new Set(items.map((item) => item.clause_id.split(".")[0] ?? item.clause_id))
    );
    return groups.sort((a, b) => Number(a) - Number(b));
  }, [items]);

  useEffect(() => {
    if (!clauseGroups.length) return;
    if (!clauseGroups.includes(activeClause)) {
      setActiveClause(clauseGroups[0]);
    }
  }, [clauseGroups, activeClause]);

  useEffect(() => {
    if (!items.length) return;
    setNotesDraft((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (next[item.id] === undefined) next[item.id] = item.notes ?? "";
      }
      return next;
    });

    setDateDraft((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (next[item.id] === undefined) next[item.id] = item.next_audit_date ?? "";
      }
      return next;
    });
  }, [items]);

  const filteredItems = useMemo(
    () => items.filter((item) => item.clause_id === activeClause || item.clause_id.startsWith(`${activeClause}.`)),
    [items, activeClause]
  );

  const progress = useMemo(() => {
    if (!items.length) return 0;
    const completed = items.filter((item) => item.status !== "pending").length;
    return Math.round((completed / items.length) * 100);
  }, [items]);

  const openCars = useMemo(() => cars.filter((car) => car.status !== "closed").length, [cars]);

  function handleExportPdf() {
    if (!audit) return;
    try {
      exportAuditToPdf({
        ref: audit.ref,
        title: audit.title,
        state: audit.state,
        audit_date: audit.audit_date,
        created_at: audit.created_at,
        audit_manager: audit.audit_manager ?? null,
        checks: items.map((item) => ({
          clause_id: item.clause_id,
          title: item.title,
          question: item.question,
          status: formatStatus(item.status),
          notes: item.notes,
          next_audit_date: item.next_audit_date,
        })),
        cars: cars.map((car) => ({
          car_code: car.car_code,
          finding_clause_id: car.finding_clause_id,
          finding_title: car.finding_title,
          description: car.description,
          status: formatStatus(car.status),
          root_cause: car.root_cause,
          action_plan: car.action_plan,
        })),
      });
      toast.success("PDF de auditoria generado");
    } catch {
      toast.error("No se pudo exportar el PDF");
    }
  }

  async function updateCheckStatus(item: AuditItem, status: AuditStatus) {
    if (!hasPermission("sgc", "edit")) return;
    setSavingItemId(item.id);
    try {
      const response = await fetch(`/api/v1/sgc/audit/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Error actualizando estatus");
      await mutate();
      toast.success(status === "noconf" ? "No conformidad registrada" : "Estatus actualizado");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingItemId(null);
    }
  }

  async function saveCheckNotes(item: AuditItem) {
    if (!hasPermission("sgc", "edit")) return;
    setSavingItemId(item.id);
    try {
      const response = await fetch(`/api/v1/sgc/audit/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notesDraft[item.id] ?? "",
          next_audit_date: dateDraft[item.id] || null,
        }),
      });
      if (!response.ok) throw new Error("Error guardando notas");
      await mutate();
      toast.success("Checklist guardado");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleUpdateCar() {
    if (!selectedCarId) return;
    setSavingCarId(selectedCarId);
    try {
      const response = await fetch(`/api/v1/sgc/audit/cars/${selectedCarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: carStatus,
          root_cause: carRootCause,
          action_plan: carActionPlan,
          owner_name: carOwner,
          due_date: carDueDate || null,
        }),
      });
      if (!response.ok) throw new Error("Error actualizando hallazgo");
      await mutate();
      toast.success("Hallazgo (CAR) actualizado correctamente");
      setSelectedCarId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingCarId(null);
    }
  }

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>;
  if (!audit) return <div className="p-20 text-center text-rose-400">Auditoria no encontrada.</div>;

  return (
    <div className="space-y-6">
      {/* ... header and cards ... */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack} className="border-slate-800 h-9">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              {audit.title}
              <Badge variant="outline" className="border-slate-700 text-slate-400 font-mono text-[10px]">
                {audit.ref}
              </Badge>
            </h2>
            <p className="text-xs text-slate-500">
              Iniciada el {new Date(audit.created_at).toLocaleDateString()} · Responsable: {audit.audit_manager?.full_name ?? "No asignado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="border-slate-800">
            <Download className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
           <Badge className={cn("px-3 py-1", audit.state === "done" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20")}>
              {audit.state === "done" ? "Finalizada" : "En curso"}
           </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="h-fit border-slate-800 bg-slate-900/40 backdrop-blur-sm">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <LayoutGrid className="h-3.5 w-3.5" /> Clausulas ISO
            </CardTitle>
          </CardHeader>
          <div className="space-y-1 px-2 pb-4">
            {clauseGroups.map((clause) => (
              <button
                key={clause}
                onClick={() => setActiveClause(clause)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-all",
                  activeClause === clause
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-400 hover:bg-slate-800/50"
                )}
              >
                <span>Clausula {clause}</span>
                {activeClause === clause && <ChevronRight className="h-3 w-3" />}
              </button>
            ))}
            <div className="mt-4 border-t border-slate-800 px-2 pt-4">
              <div className="mb-2 flex justify-between text-[10px] font-bold uppercase text-slate-500">
                <span>Avance</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="bg-slate-950/50 border-slate-800 p-1">
              <TabsTrigger value="checklist" className="text-xs data-[state=active]:bg-slate-800">
                <ClipboardCheck className="mr-2 h-3.5 w-3.5" /> Checklist
              </TabsTrigger>
              <TabsTrigger value="car" className="text-xs data-[state=active]:bg-slate-800">
                <ShieldAlert className="mr-2 h-3.5 w-3.5" /> Hallazgos (CAR)
                {openCars > 0 && <Badge className="ml-2 h-4 min-w-4 bg-red-500 text-[9px]">{openCars}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="evidence" className="text-xs data-[state=active]:bg-slate-800">
                <FileText className="mr-2 h-3.5 w-3.5" /> Evidencias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="mt-4 space-y-4">
               {filteredItems.map((item) => (
                 <Card key={item.id} className="border-slate-800 bg-slate-900/40">
                   <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{item.clause_id}</span>
                            <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          </div>
                          <p className="text-xs text-slate-400">{item.question}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {item.tags.map(t => <Badge key={t} variant="outline" className="text-[9px] h-5 border-slate-800 text-slate-500">{t}</Badge>)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={savingItemId === item.id}
                          onClick={() => updateCheckStatus(item, "cumple")}
                          className={cn("text-xs border-slate-800", item.status === "cumple" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30")}
                        >
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Cumple
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={savingItemId === item.id}
                          onClick={() => updateCheckStatus(item, "noconf")}
                          className={cn("text-xs border-slate-800", item.status === "noconf" && "bg-rose-500/10 text-rose-400 border-rose-500/30")}
                        >
                          <XCircle className="mr-2 h-3.5 w-3.5" /> No conformidad
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={savingItemId === item.id}
                          onClick={() => updateCheckStatus(item, "oport")}
                          className={cn("text-xs border-slate-800", item.status === "oport" && "bg-amber-500/10 text-amber-400 border-amber-500/30")}
                        >
                          <AlertCircle className="mr-2 h-3.5 w-3.5" /> Oportunidad
                        </Button>
                      </div>

                      <div className="flex gap-3">
                        <Textarea
                          placeholder="Notas y evidencia..."
                          className="bg-slate-950/50 border-slate-800 text-xs min-h-[60px]"
                          value={notesDraft[item.id] ?? ""}
                          onChange={(e) => setNotesDraft(prev => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <div className="flex flex-col gap-2 shrink-0">
                           <Button size="sm" onClick={() => saveCheckNotes(item)} disabled={savingItemId === item.id}>
                             {savingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                             Guardar
                           </Button>
                        </div>
                      </div>
                   </CardContent>
                 </Card>
               ))}
            </TabsContent>
            
            <TabsContent value="car" className="mt-4 space-y-4">
               {cars.length === 0 ? (
                 <div className="text-center py-10 text-slate-500 text-xs italic bg-slate-900/20 border border-dashed border-slate-800 rounded-lg">
                   No se han registrado hallazgos o no conformidades en esta auditoria.
                 </div>
               ) : (
                 cars.map((car) => (
                   <Card key={car.id} className="border-slate-800 bg-slate-900/40">
                     <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[10px] border-slate-700 text-primary">
                                {car.car_code}
                              </Badge>
                              <h4 className="text-sm font-semibold text-white">{car.finding_title}</h4>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-1 italic">Clausula {car.finding_clause_id}</p>
                            <p className="text-xs text-slate-500 mt-2">{car.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                             <Badge className={cn(
                               "text-[10px]",
                               car.status === "open" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                               car.status === "in_progress" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                               "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                             )}>
                               {car.status === "open" ? "Abierta" : car.status === "in_progress" ? "En curso" : "Cerrada"}
                             </Badge>
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-[10px] text-slate-400 hover:text-primary"
                              onClick={() => setSelectedCarId(car.id)}
                            >
                               Gestionar <ChevronRight className="h-3 w-3 ml-1" />
                             </Button>
                          </div>
                        </div>

                        {(car.root_cause || car.action_plan) && (
                          <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/50">
                            <div>
                               <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Causa Raiz</p>
                               <p className="text-[11px] text-slate-300 line-clamp-2">{car.root_cause || "-"}</p>
                            </div>
                            <div>
                               <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Plan de Accion</p>
                               <p className="text-[11px] text-slate-300 line-clamp-2">{car.action_plan || "-"}</p>
                            </div>
                          </div>
                        )}
                     </CardContent>
                   </Card>
                 ))
               )}

               {/* CAR Editor Dialog */}
               <Dialog open={!!selectedCarId} onOpenChange={(open) => !open && setSelectedCarId(null)}>
                 <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl">
                   <DialogHeader>
                     <DialogTitle className="flex items-center gap-2">
                       Gestionar Hallazgo 
                       <Badge variant="outline" className="font-mono text-xs border-slate-700 text-primary">
                         {selectedCar?.car_code}
                       </Badge>
                     </DialogTitle>
                     <DialogDescription className="text-slate-400 text-xs">
                       Completa el análisis de causa raíz y define el plan de acción correctiva.
                     </DialogDescription>
                   </DialogHeader>

                   <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Responsable</label>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <Input 
                              placeholder="Nombre del responsable"
                              value={carOwner}
                              onChange={(e) => setCarOwner(e.target.value)}
                              className="pl-10 bg-slate-900 border-slate-800 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fecha Compromiso</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <Input 
                              type="date"
                              value={carDueDate}
                              onChange={(e) => setCarDueDate(e.target.value)}
                              className="pl-10 bg-slate-900 border-slate-800 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Estatus de Hallazgo</label>
                        <div className="flex gap-2">
                          {["open", "in_progress", "closed"].map((s) => (
                            <Button
                              key={s}
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => setCarStatus(s as CarStatus)}
                              className={cn(
                                "flex-1 text-[10px] h-8 border-slate-800",
                                carStatus === s && (
                                  s === "open" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                                  s === "in_progress" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                )
                              )}
                            >
                              {s === "open" ? "Abierto" : s === "in_progress" ? "En Progreso" : "Cerrado"}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Analisis de Causa Raiz</label>
                        <Textarea 
                          placeholder="Describe por que ocurrio la no conformidad..."
                          value={carRootCause}
                          onChange={(e) => setCarRootCause(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-sm min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Plan de Accion / Correccion</label>
                        <Textarea 
                          placeholder="Describe que acciones se tomaran para evitar recurrencia..."
                          value={carActionPlan}
                          onChange={(e) => setCarActionPlan(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-sm min-h-[80px]"
                        />
                      </div>
                   </div>

                   <DialogFooter className="gap-2 sm:gap-0">
                     <Button variant="ghost" size="sm" onClick={() => setSelectedCarId(null)}>Cancelar</Button>
                     <Button size="sm" onClick={handleUpdateCar} disabled={savingCarId !== null}>
                       {savingCarId !== null ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                       Guardar Cambios
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
            </TabsContent>


            <TabsContent value="evidence" className="mt-4">
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader className="pb-3 border-b border-slate-800/50">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
                    Evidencias de auditoria
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Adjunta listas, actas, fotos o evidencia objetiva del ciclo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {hasPermission("sgc", "edit") && (
                    <DocumentUpload
                      moduleSlug="sgc-audits"
                      recordId={audit.id}
                      onUpload={() => {
                        void mutate();
                      }}
                    />
                  )}
                  <DocumentList
                    moduleSlug="sgc-audits"
                    recordId={audit.id}
                    canDelete={hasPermission("sgc", "delete")}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SGCAudit Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SGCAudit() {
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAuditTitle, setNewAuditTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/v1/sgc/audits", fetcher);
  const { hasPermission, isAdmin, isAtLeastSupervisor, isLoading: userLoading } = useUser();

  const audits: AuditInstance[] = useMemo(() => data?.audits ?? [], [data?.audits]);

  async function handleCreate() {
    if (!newAuditTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/sgc/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newAuditTitle.trim() }),
      });
      if (!res.ok) throw new Error("Error creando auditoria");
      const { audit } = await res.json();
      toast.success("Auditoria creada");
      setIsCreateOpen(false);
      setNewAuditTitle("");
      mutate();
      setSelectedAuditId(audit.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  // Prevent flicker by showing a blank state or skeleton while user/data loads
  if (userLoading || (isLoading && !data)) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Iniciando sistema de auditoria...</p>
      </div>
    );
  }

  if (selectedAuditId) {
    return <AuditDetail auditId={selectedAuditId} onBack={() => setSelectedAuditId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Auditorias SGC</h2>
          <p className="text-sm text-slate-400">Ciclos de auditoria interna para cumplimiento normativo.</p>
        </div>
        {isAtLeastSupervisor && (
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Nueva Auditoria
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {audits.length === 0 ? (
          <Card className="border-dashed border-slate-800 bg-slate-900/20 py-20">
            <CardContent className="flex flex-col items-center gap-4">
              <ClipboardCheck className="h-12 w-12 text-slate-700 opacity-20" />
              <p className="text-slate-500 text-sm">No se han registrado ciclos de auditoria.</p>
              {isAtLeastSupervisor && (
                <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)} className="border-slate-800">
                  Comenzar primera auditoria
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-800 bg-slate-900/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950/40">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500">Referencia</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500">Titulo / Objetivo</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500">Fecha</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500">Estatus</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500 text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow 
                    key={audit.id} 
                    className="border-slate-800/40 hover:bg-white/5 cursor-pointer group"
                    onClick={() => setSelectedAuditId(audit.id)}
                  >
                    <TableCell className="font-mono text-xs text-slate-400">{audit.ref}</TableCell>
                    <TableCell className="font-medium text-slate-200">{audit.title}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] border-none", audit.state === "done" ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary")}>
                        {audit.state === "done" ? "Finalizada" : "En curso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-slate-400 group-hover:text-primary">
                        Gestionar <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Nueva Auditoria Interna</DialogTitle>
            <DialogDescription className="text-slate-400">
              Crea un nuevo ciclo de auditoria. Se generará un checklist basado en las cláusulas ISO estándar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Titulo de la Auditoria</label>
            <Input 
              placeholder="Ej: Auditoria Interna QMS 2024 - Q1"
              value={newAuditTitle}
              onChange={(e) => setNewAuditTitle(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newAuditTitle.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Crear Ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
