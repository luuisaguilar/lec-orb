"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  ClipboardCheck,
  History,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Save,
  Calendar,
  User,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AUDIT_CLAUSES } from "@/lib/data/hr";
import { toast } from "sonner";

type AuditStatus = "pending" | "cumple" | "noconf" | "oport";
type CarStatus = "open" | "in_progress" | "closed";

type HrAuditItem = {
  id: string;
  clause_id: string;
  title: string;
  question: string;
  status: AuditStatus;
  notes: string | null;
  tags: string[];
  sort_order: number;
  updated_at: string;
};

type HrAuditCar = {
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
};

type HrAuditResponse = {
  items: HrAuditItem[];
  cars: HrAuditCar[];
};

type CarDraft = {
  root_cause: string;
  action_plan: string;
  owner_name: string;
  due_date: string;
  status: CarStatus;
};

const fetcher = async (url: string): Promise<HrAuditResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("No se pudo cargar la auditoria RRHH");
  }
  return response.json();
};

async function parseApiResponse(response: Response) {
  if (response.ok) return response.json();
  const payload = await response.json().catch(() => ({}));
  throw new Error(payload?.error || "Error en la solicitud");
}

export default function HRAudit() {
  const [activeClause, setActiveClause] = useState("4");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [carDrafts, setCarDrafts] = useState<Record<string, CarDraft>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [savingCarId, setSavingCarId] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useSWR("/api/v1/hr/audit", fetcher);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const cars = useMemo(() => data?.cars ?? [], [data?.cars]);

  useEffect(() => {
    if (!items.length) return;
    setNotesDraft((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (next[item.id] === undefined) next[item.id] = item.notes ?? "";
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!cars.length) return;
    setCarDrafts((prev) => {
      const next = { ...prev };
      for (const car of cars) {
        if (!next[car.id]) {
          next[car.id] = {
            root_cause: car.root_cause ?? "",
            action_plan: car.action_plan ?? "",
            owner_name: car.owner_name ?? "",
            due_date: car.due_date ?? "",
            status: car.status,
          };
        }
      }
      return next;
    });
  }, [cars]);

  const filteredItems = useMemo(
    () => items.filter((item) => item.clause_id.startsWith(`${activeClause}.`)),
    [items, activeClause]
  );

  const progress = useMemo(() => {
    if (!items.length) return 0;
    const completed = items.filter((item) => item.status !== "pending").length;
    return Math.round((completed / items.length) * 100);
  }, [items]);

  const openCars = useMemo(
    () => cars.filter((car) => car.status !== "closed").length,
    [cars]
  );

  const timeline = useMemo(
    () =>
      [...items]
        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
        .slice(0, 10),
    [items]
  );

  const updateStatus = async (item: HrAuditItem, status: AuditStatus) => {
    setSavingItemId(item.id);
    try {
      const response = await fetch(`/api/v1/hr/audit/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await parseApiResponse(response);
      await mutate();
      toast.success(status === "noconf" ? "No conformidad registrada y CAR generado" : "Estatus actualizado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el estatus");
    } finally {
      setSavingItemId(null);
    }
  };

  const saveNotes = async (item: HrAuditItem) => {
    setSavingItemId(item.id);
    try {
      const response = await fetch(`/api/v1/hr/audit/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft[item.id] ?? "" }),
      });
      await parseApiResponse(response);
      await mutate();
      toast.success("Observaciones guardadas");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar las observaciones");
    } finally {
      setSavingItemId(null);
    }
  };

  const saveCar = async (car: HrAuditCar) => {
    const draft = carDrafts[car.id];
    if (!draft) return;

    setSavingCarId(car.id);
    try {
      const response = await fetch(`/api/v1/hr/audit/cars/${car.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          root_cause: draft.root_cause || null,
          action_plan: draft.action_plan || null,
          owner_name: draft.owner_name || null,
          due_date: draft.due_date || null,
          status: draft.status,
        }),
      });
      await parseApiResponse(response);
      await mutate();
      toast.success("CAR actualizada");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la CAR");
    } finally {
      setSavingCarId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-10 text-center text-slate-400">
        Cargando auditoria RRHH...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-10 text-center text-red-300">
        No se pudo cargar la auditoria RRHH.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 bg-slate-900/40 border-slate-800 backdrop-blur-sm h-fit">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-outfit text-white uppercase tracking-widest flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Clausulas ISO
            </CardTitle>
          </CardHeader>
          <div className="px-2 pb-4 space-y-1">
            {AUDIT_CLAUSES.map((clause) => (
              <button
                key={clause.id}
                onClick={() => setActiveClause(clause.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between",
                  activeClause === clause.id
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-400 hover:bg-slate-800/50"
                )}
              >
                <span>{clause.id}. {clause.name}</span>
                {activeClause === clause.id && <ChevronRight className="w-3 h-3" />}
              </button>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-800 px-2">
              <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold mb-2">
                <span>Avance Auditoria</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-3">CAR abiertas: {openCars}</p>
            </div>
          </div>
        </Card>

        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="bg-slate-950/50 border border-slate-800 h-auto p-1">
              <TabsTrigger value="checklist" className="data-[state=active]:bg-slate-800 text-xs py-1.5 px-4">
                <ClipboardCheck className="w-3.5 h-3.5 mr-2" /> Checklist
              </TabsTrigger>
              <TabsTrigger value="car" className="data-[state=active]:bg-slate-800 text-xs py-1.5 px-4">
                <ShieldAlert className="w-3.5 h-3.5 mr-2" /> Acciones Correctivas (CAR)
                {openCars > 0 && (
                  <Badge className="ml-2 bg-red-500 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]">
                    {openCars}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-slate-800 text-xs py-1.5 px-4">
                <History className="w-3.5 h-3.5 mr-2" /> Historico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="mt-4 space-y-4">
              <Card className="bg-slate-900/20 border-slate-800">
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auditor Lider</label>
                    <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded border border-slate-800">
                      <User className="w-3 h-3 text-primary" />
                      <Input className="bg-transparent border-none text-xs text-slate-300 h-auto p-0 focus-visible:ring-0" placeholder="Nombre del auditor..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</label>
                    <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded border border-slate-800">
                      <Calendar className="w-3 h-3 text-primary" />
                      <Input type="date" className="bg-transparent border-none text-xs text-slate-300 h-auto p-0 focus-visible:ring-0 dark:[color-scheme:dark]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const noteValue = notesDraft[item.id] ?? "";
                  const savingThisItem = savingItemId === item.id;
                  return (
                    <Card key={item.id} className="bg-slate-900/40 border-slate-800 group hover:border-slate-700 transition-all overflow-hidden">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-primary font-bold font-outfit">{item.clause_id}</span>
                              <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                            </div>
                            <p className="text-xs text-slate-400">{item.question}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 items-start shrink-0">
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[9px] bg-slate-950/50 border-slate-800 text-slate-500 py-0 h-5">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Button
                            variant="outline"
                            disabled={savingThisItem}
                            onClick={() => updateStatus(item, "cumple")}
                            className={cn(
                              "h-9 text-xs border-slate-800 hover:bg-green-500/10 hover:text-green-400",
                              item.status === "cumple" && "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                            )}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Cumple
                          </Button>
                          <Button
                            variant="outline"
                            disabled={savingThisItem}
                            onClick={() => updateStatus(item, "noconf")}
                            className={cn(
                              "h-9 text-xs border-slate-800 hover:bg-red-500/10 hover:text-red-400",
                              item.status === "noconf" && "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                            )}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-2" /> No Conformidad
                          </Button>
                          <Button
                            variant="outline"
                            disabled={savingThisItem}
                            onClick={() => updateStatus(item, "oport")}
                            className={cn(
                              "h-9 text-xs border-slate-800 hover:bg-yellow-500/10 hover:text-yellow-400",
                              item.status === "oport" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                            )}
                          >
                            <AlertCircle className="w-3.5 h-3.5 mr-2" /> Oportunidad
                          </Button>
                        </div>

                        <Textarea
                          placeholder="Observaciones y evidencia encontrada..."
                          className="bg-slate-950/50 border-slate-800 text-xs min-h-[60px] focus-visible:ring-primary/30"
                          value={noteValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNotesDraft((prev) => ({ ...prev, [item.id]: value }));
                          }}
                        />

                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => saveNotes(item)} disabled={savingThisItem}>
                            {savingThisItem ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                            Guardar Observaciones
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="car" className="mt-4">
              <div className="space-y-4">
                {cars.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl">
                    <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                    <p className="text-slate-500 text-sm">No hay acciones correctivas abiertas.</p>
                  </div>
                ) : (
                  cars.map((car) => {
                    const draft = carDrafts[car.id] ?? {
                      root_cause: "",
                      action_plan: "",
                      owner_name: "",
                      due_date: "",
                      status: car.status,
                    };
                    const savingThisCar = savingCarId === car.id;

                    return (
                      <Card key={car.id} className="bg-slate-900/40 border-slate-800 overflow-hidden">
                        <CardHeader className="bg-slate-950/40 p-4 border-b border-slate-800 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">{car.car_code}</Badge>
                            <span className="text-xs font-bold text-slate-300">Hallazgo: {car.finding_clause_id}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
                            {new Date(car.created_at).toLocaleDateString()}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white">{car.finding_title}</h4>
                            <p className="text-xs text-slate-400 italic">&quot;{car.description}&quot;</p>
                          </div>

                          <div className="grid grid-cols-1 gap-4 mt-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estatus CAR</label>
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  variant="outline"
                                  className={cn("h-8 text-xs border-slate-700", draft.status === "open" && "border-red-500/50 text-red-300")}
                                  onClick={() =>
                                    setCarDrafts((prev) => ({
                                      ...prev,
                                      [car.id]: { ...draft, status: "open" },
                                    }))
                                  }
                                >
                                  Abierta
                                </Button>
                                <Button
                                  variant="outline"
                                  className={cn("h-8 text-xs border-slate-700", draft.status === "in_progress" && "border-amber-500/50 text-amber-300")}
                                  onClick={() =>
                                    setCarDrafts((prev) => ({
                                      ...prev,
                                      [car.id]: { ...draft, status: "in_progress" },
                                    }))
                                  }
                                >
                                  En curso
                                </Button>
                                <Button
                                  variant="outline"
                                  className={cn("h-8 text-xs border-slate-700", draft.status === "closed" && "border-emerald-500/50 text-emerald-300")}
                                  onClick={() =>
                                    setCarDrafts((prev) => ({
                                      ...prev,
                                      [car.id]: { ...draft, status: "closed" },
                                    }))
                                  }
                                >
                                  Cerrada
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analisis Causa Raiz (5 Porques)</label>
                              <Textarea
                                placeholder="Describa la causa raiz..."
                                className="bg-slate-950/30 border-slate-800 text-xs h-20"
                                value={draft.root_cause}
                                onChange={(e) =>
                                  setCarDrafts((prev) => ({
                                    ...prev,
                                    [car.id]: { ...draft, root_cause: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plan de Accion y Responsable</label>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="Responsable..."
                                  className="bg-slate-950/30 border-slate-800 text-xs h-8"
                                  value={draft.owner_name}
                                  onChange={(e) =>
                                    setCarDrafts((prev) => ({
                                      ...prev,
                                      [car.id]: { ...draft, owner_name: e.target.value },
                                    }))
                                  }
                                />
                                <Input
                                  type="date"
                                  className="bg-slate-950/30 border-slate-800 text-xs h-8 dark:[color-scheme:dark]"
                                  value={draft.due_date}
                                  onChange={(e) =>
                                    setCarDrafts((prev) => ({
                                      ...prev,
                                      [car.id]: { ...draft, due_date: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <Textarea
                                placeholder="Acciones especificas..."
                                className="bg-slate-950/30 border-slate-800 text-xs h-20 mt-2"
                                value={draft.action_plan}
                                onChange={(e) =>
                                  setCarDrafts((prev) => ({
                                    ...prev,
                                    [car.id]: { ...draft, action_plan: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-xs" onClick={() => saveCar(car)} disabled={savingThisCar}>
                              {savingThisCar ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                              Guardar Avance
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card className="bg-slate-900/40 border-slate-800">
                <CardContent className="p-4 space-y-3">
                  {timeline.length === 0 ? (
                    <p className="text-slate-500 italic text-sm">No hay registros de auditorias aun.</p>
                  ) : (
                    timeline.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                        <div>
                          <p className="text-xs text-slate-200 font-medium">{item.clause_id} · {item.title}</p>
                          <p className="text-[11px] text-slate-500">Estatus: {item.status}</p>
                        </div>
                        <p className="text-[11px] text-slate-500">{new Date(item.updated_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
