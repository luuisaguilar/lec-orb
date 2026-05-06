"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { 
  Plus, 
  Loader2, 
  ChevronRight, 
  FileText, 
  Calendar, 
  ArrowLeft, 
  Save,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { exportReviewToPdf } from "@/lib/sgc/pdf-export";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Review {
  id: string;
  ref: string;
  title: string;
  review_date: string;
  state: "open" | "done";
  policy: string | null;
  changes: string | null;
  conclusion: string | null;
  created_at: string;
  creator?: { full_name: string };
}

export default function SGCReviews() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/v1/sgc/reviews", fetcher);
  const { hasPermission, isAtLeastSupervisor, isLoading: userLoading } = useUser();

  const reviews: Review[] = data?.reviews ?? [];

  // Detail view state (if an item is selected)
  const { data: detailData, isLoading: detailLoading, mutate: mutateDetail } = useSWR(
    selectedId ? `/api/v1/sgc/reviews/${selectedId}` : null,
    fetcher
  );

  const review: Review | undefined = detailData?.review;

  const [formDraft, setFormDraft] = useState<Partial<Review>>({});

  useEffect(() => {
    if (review) {
      setFormDraft({
        policy: review.policy ?? "",
        changes: review.changes ?? "",
        conclusion: review.conclusion ?? "",
        title: review.title,
      });
    }
  }, [review]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/sgc/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error("Error creando revisión");
      const { review: newRev } = await res.json();
      toast.success("Revisión por la dirección creada");
      setIsCreateOpen(false);
      setNewTitle("");
      mutate();
      setSelectedId(newRev.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!selectedId || !hasPermission("sgc", "edit")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/sgc/reviews/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formDraft),
      });
      if (!res.ok) throw new Error("Error guardando cambios");
      toast.success("Revisión actualizada");
      mutateDetail();
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    if (!selectedId || !hasPermission("sgc", "edit")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/sgc/reviews/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "done" }),
      });
      if (!res.ok) throw new Error("Error cerrando revisión");
      toast.success("Revisión cerrada satisfactoriamente");
      mutateDetail();
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (userLoading || (isLoading && !data)) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Iniciando ciclo de revisión...</p>
      </div>
    );
  }

  if (selectedId && review) {
    const handleExportPdf = () => {
      try {
        exportReviewToPdf({
          ref: review.ref,
          title: review.title,
          state: review.state,
          review_date: review.review_date,
          policy: formDraft.policy ?? review.policy ?? "",
          changes: formDraft.changes ?? review.changes ?? "",
          conclusion: formDraft.conclusion ?? review.conclusion ?? "",
        });
        toast.success("PDF de revision generado");
      } catch {
        toast.error("No se pudo exportar el PDF");
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedId(null)} className="border-slate-200 dark:border-slate-800">
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                {review.title}
                <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                  {review.ref}
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fecha de Revisión: {new Date(review.review_date).toLocaleDateString()} · Creado por: {review.creator?.full_name ?? "Sistema"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="border-slate-200 dark:border-slate-800">
              <Download className="h-3.5 w-3.5 mr-2" /> Exportar PDF
            </Button>
            {review.state === "open" ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                  Guardar Borrador
                </Button>
                <Button size="sm" onClick={handleClose} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Finalizar Revisión
                </Button>
              </>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">
                Completada
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40">
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/50">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">1. Politica y Objetivos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">Evaluación de la adecuación y eficacia de la política de calidad y los objetivos estratégicos.</p>
                <Textarea 
                  className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 min-h-[150px]"
                  placeholder="Describe el estado de la política..."
                  value={formDraft.policy ?? ""}
                  onChange={(e) => setFormDraft(p => ({ ...p, policy: e.target.value }))}
                  disabled={review.state === "done"}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40">
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/50">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">2. Cambios y Desempeño</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">Cambios en las cuestiones externas e internas, desempeño de los procesos y conformidad de los productos/servicios.</p>
                <Textarea 
                  className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 min-h-[150px]"
                  placeholder="Resultados de auditorías, retroalimentación del cliente..."
                  value={formDraft.changes ?? ""}
                  onChange={(e) => setFormDraft(p => ({ ...p, changes: e.target.value }))}
                  disabled={review.state === "done"}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40">
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/50">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Conclusiones</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">Decisiones relacionadas con oportunidades de mejora y necesidades de cambio.</p>
                <Textarea 
                  className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 min-h-[200px]"
                  placeholder="Resumen ejecutivo y próximos pasos..."
                  value={formDraft.conclusion ?? ""}
                  onChange={(e) => setFormDraft(p => ({ ...p, conclusion: e.target.value }))}
                  disabled={review.state === "done"}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40">
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/50">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Evidencias</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {hasPermission("sgc", "edit") && (
                  <DocumentUpload
                    moduleSlug="sgc-reviews"
                    recordId={review.id}
                    onUpload={() => {
                      void mutateDetail();
                      void mutate();
                    }}
                  />
                )}
                <DocumentList
                  moduleSlug="sgc-reviews"
                  recordId={review.id}
                  canDelete={hasPermission("sgc", "delete")}
                />
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-200 uppercase tracking-tighter">Nota de Cumplimiento</p>
                  <p className="text-[11px] text-amber-500/80 leading-relaxed">
                    Esta revisión es un requisito mandatorio de la norma ISO 9001:2015 (Cláusula 9.3). Debe incluir entradas sobre riesgos, recursos y eficacia del sistema.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Revisión por la Dirección</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Evaluación periódica del SGC para asegurar su conveniencia y adecuación.</p>
        </div>
        {isAtLeastSupervisor && (
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Nueva Revisión
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {reviews.length === 0 ? (
          <Card className="border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white dark:bg-slate-900/20 py-20">
            <CardContent className="flex flex-col items-center gap-4">
              <FileText className="h-12 w-12 text-slate-700 opacity-20" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No se han registrado ciclos de revisión directiva.</p>
              {isAtLeastSupervisor && (
                <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)} className="border-slate-200 dark:border-slate-800">
                  Iniciar ciclo anual/semestral
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-white dark:bg-slate-900/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40">
                <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Ref</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Titulo / Periodo</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Fecha</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Estatus</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((rev) => (
                  <TableRow 
                    key={rev.id} 
                    className="border-slate-200 dark:border-slate-200 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer group"
                    onClick={() => setSelectedId(rev.id)}
                  >
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{rev.ref}</TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">{rev.title}</TableCell>
                    <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(rev.review_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] border-none", rev.state === "done" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                        {rev.state === "done" ? "Completada" : "En borrador"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 group-hover:text-primary">
                        Abrir Acta <ChevronRight className="h-4 w-4 ml-1" />
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
        <DialogContent className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>Nuevo Acta de Revisión</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Inicia una nueva revisión directiva para evaluar el desempeño global del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 block">Titulo del Acta</label>
            <Input 
              placeholder="Ej: Revision Anual SGC 2024"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Crear Acta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

