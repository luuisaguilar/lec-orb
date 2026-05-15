"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Users,
  Search,
  ChevronRight,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  UserCircle2,
  ListChecks,
  Link2,
  FolderKanban,
  FileCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateJobProfilePDFFromView } from "@/lib/utils/pdf-generator";
import { toast } from "sonner";

type HrProfileRow = {
  id: string;
  node_id: string;
  role_title: string;
  holder_name: string | null;
  area: string | null;
  role_type: "directive" | "coordination" | "operative" | null;
  mission: string | null;
  responsibilities: string[] | string | null;
  requirements: {
    education?: string;
    experience?: string;
    specialty?: string;
    languages?: string;
    knowledge?: string;
    skills?: string;
    travel?: string;
    sex?: string;
    desiredExp?: string;
    attributes?: string;
    otherRoles?: string;
  } | null;
  parent_node_id: string | null;
  process_id: string | null;
  last_pdf_path: string | null;
};

type HrProfileView = {
  id: string;
  title: string;
  reportsTo: string[];
  subordinates: string[];
  mission: string;
  sex?: string;
  experience?: string;
  travel?: string;
  education?: string;
  specialty?: string;
  desiredExp?: string;
  knowledge?: string;
  skills?: string;
  languages?: string;
  responsibilities: string;
  otherRoles?: string;
  attributes?: string;
  processId?: string;
  file?: string;
  holderName?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function normalizeToString(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join("\n");
  return String(value);
}

function mapProfiles(rows: HrProfileRow[]): HrProfileView[] {
  const titleByNode = new Map(rows.map((row) => [row.node_id, row.role_title]));
  const childrenByNode = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.parent_node_id) continue;
    const current = childrenByNode.get(row.parent_node_id) ?? [];
    current.push(row.role_title);
    childrenByNode.set(row.parent_node_id, current);
  }

  return rows.map((row) => {
    const req = row.requirements ?? {};
    const parentTitle =
      row.parent_node_id && titleByNode.get(row.parent_node_id)
        ? titleByNode.get(row.parent_node_id)!
        : row.parent_node_id;

    return {
      id: row.node_id,
      title: row.role_title,
      reportsTo: parentTitle ? [parentTitle] : [],
      subordinates: childrenByNode.get(row.node_id) ?? [],
      mission: row.mission ?? "",
      sex: req.sex ?? "",
      experience: req.experience ?? "",
      travel: req.travel ?? "",
      education: req.education ?? "",
      specialty: req.specialty ?? "",
      desiredExp: req.desiredExp ?? "",
      knowledge: req.knowledge ?? "",
      skills: req.skills ?? "",
      languages: req.languages ?? "",
      responsibilities: normalizeToString(row.responsibilities),
      otherRoles: req.otherRoles ?? "",
      attributes: req.attributes ?? "",
      processId: row.process_id ?? "",
      file: row.last_pdf_path ?? "",
      holderName: row.holder_name ?? "Vacante / Por asignar",
    };
  });
}

export default function HRProfiles() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data, isLoading, error } = useSWR("/api/v1/hr/profiles", fetcher);

  const profiles = useMemo(
    () => mapProfiles((data?.profiles ?? []) as HrProfileRow[]),
    [data]
  );

  const effectiveSelectedId = useMemo(() => {
    if (!profiles.length) return null;
    if (selectedId && profiles.some((p) => p.id === selectedId)) return selectedId;
    return profiles[0].id;
  }, [profiles, selectedId]);

  const filteredProfiles = useMemo(
    () =>
      profiles.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toLowerCase().includes(search.toLowerCase())
      ),
    [profiles, search]
  );

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === effectiveSelectedId) ?? null,
    [profiles, effectiveSelectedId]
  );

  const getLines = (value?: string) =>
    (value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  const renderInfoBlock = (label: string, value?: string, multiline?: boolean) => (
    <div className="bg-indigo-950/80 p-4 rounded-xl border border-indigo-800/40 shadow-inner shadow-indigo-500/10">
      <h4 className="text-sm font-bold text-indigo-200 mb-2 uppercase tracking-wider">{label}</h4>
      <p className={cn("text-sm font-medium text-slate-50 leading-relaxed", multiline && "whitespace-pre-line")}>
        {value?.trim() || "No especificado"}
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-220px)] flex items-center justify-center">
        <div className="flex items-center gap-2 text-indigo-200">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando perfiles de RRHH...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-220px)] flex items-center justify-center">
        <p className="text-sm text-red-400">No se pudieron cargar los perfiles de RRHH.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-indigo-950/80 border-indigo-900/60 backdrop-blur-sm flex flex-col overflow-hidden shrink-0 w-full lg:w-80 h-[calc(100vh-120px)] lg:sticky lg:top-4">
        <div className="p-3 border-b border-indigo-900/60 shrink-0 bg-indigo-950 backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-indigo-400" />
            <Input
              placeholder="Buscar perfil..."
              className="pl-8 h-8 text-xs bg-indigo-950/80 border-indigo-900/60 text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 mt-2 px-1">
            {filteredProfiles.length} perfiles
          </p>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-3 pb-3">
          <div className="space-y-1 py-2">
            {filteredProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full flex items-start gap-2.5 rounded-lg text-left transition-all group p-2.5",
                  selectedProfile?.id === p.id
                    ? "bg-blue-600/90 text-white shadow-lg ring-1 ring-blue-400/30"
                    : "hover:bg-indigo-900/80 text-indigo-100 font-medium"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-md shrink-0 mt-0.5",
                    selectedProfile?.id === p.id ? "bg-white/20" : "bg-indigo-900 group-hover:bg-indigo-800"
                  )}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-snug line-clamp-2">{p.title}</p>
                  <p className="text-[9px] opacity-70 uppercase tracking-wider mt-0.5 line-clamp-1">{p.id}</p>
                </div>
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 mt-1.5 transition-transform",
                    selectedProfile?.id === p.id ? "translate-x-1" : "opacity-0"
                  )}
                />
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <div className="flex-1 w-full flex flex-col gap-4">
        {selectedProfile ? (
          <div className="space-y-6 pb-12 w-full">
            <Card className="bg-indigo-950/90 border-indigo-900/60 border-l-4 border-l-blue-500 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-blue-300 border-blue-500/40 bg-blue-500/10 uppercase text-[10px]">
                          {selectedProfile.id}
                        </Badge>
                        {selectedProfile.processId && (
                          <Badge variant="outline" className="text-teal-300 border-teal-500/40 bg-teal-500/15 uppercase text-[10px]">
                            PROCESO: {selectedProfile.processId}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-2xl xl:text-3xl font-bold text-white font-outfit leading-tight break-words whitespace-normal">
                        {selectedProfile.title}
                      </h2>
                      <p className="text-sm font-medium text-indigo-100">Titular actual: {selectedProfile.holderName}</p>
                      <div className="flex flex-wrap gap-4 text-sm font-medium text-indigo-100">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4" /> {selectedProfile.education || "N/A"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" /> Viajes: {selectedProfile.travel || "N/A"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <UserCircle2 className="w-4 h-4" /> Sexo: {selectedProfile.sex || "Indistinto"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <div className="text-sm font-bold text-indigo-200 uppercase tracking-wider">Reporta a:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.reportsTo.length > 0 ? (
                          selectedProfile.reportsTo.map((r) => (
                            <Badge key={r} variant="secondary" className="bg-indigo-900 text-indigo-200 border-indigo-700">
                              {r}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="bg-indigo-900 text-indigo-300 border-indigo-700">
                            Nivel raiz
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="resumen" className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto gap-1 bg-indigo-950/80 border border-indigo-900/60 p-1">
                  <TabsTrigger value="resumen" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-indigo-300 hover:text-white hover:bg-indigo-950/80 transition-colors font-medium">Resumen</TabsTrigger>
                  <TabsTrigger value="funciones" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-indigo-300 hover:text-white hover:bg-indigo-950/80 transition-colors font-medium">Funciones</TabsTrigger>
                  <TabsTrigger value="requisitos" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-indigo-300 hover:text-white hover:bg-indigo-950/80 transition-colors font-medium">Requisitos</TabsTrigger>
                  <TabsTrigger value="relaciones" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-indigo-300 hover:text-white hover:bg-indigo-950/80 transition-colors font-medium">Relaciones</TabsTrigger>
                  <TabsTrigger value="documento" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-indigo-300 hover:text-white hover:bg-indigo-950/80 transition-colors font-medium">Documento</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {renderInfoBlock("Mision del Puesto", selectedProfile.mission, true)}
                    {renderInfoBlock("Responsabilidades (resumen)", selectedProfile.responsibilities, true)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {renderInfoBlock("Educacion", selectedProfile.education)}
                    {renderInfoBlock("Experiencia", selectedProfile.experience)}
                    {renderInfoBlock("Especialidad", selectedProfile.specialty)}
                    {renderInfoBlock("Idiomas", selectedProfile.languages, true)}
                    {renderInfoBlock("Sexo", selectedProfile.sex)}
                    {renderInfoBlock("Viajes", selectedProfile.travel)}
                  </div>
                </TabsContent>

                <TabsContent value="funciones" className="mt-4 space-y-4">
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-widest border-b border-blue-400/20 pb-2">
                      <ListChecks className="w-4 h-4" /> Responsabilidades
                    </div>
                    <div className="space-y-2">
                      {getLines(selectedProfile.responsibilities).map((item, idx) => (
                        <div key={`${selectedProfile.id}-responsabilidad-${idx}`} className="rounded-lg border border-indigo-900/60 bg-indigo-950/80 p-3 text-base font-medium text-slate-50 whitespace-pre-line">
                          {item}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-teal-400 font-bold text-sm uppercase tracking-widest border-b border-teal-400/20 pb-2">
                      <Briefcase className="w-4 h-4" /> Otros Roles
                    </div>
                    <div className="space-y-2">
                      {getLines(selectedProfile.otherRoles).length > 0 ? (
                        getLines(selectedProfile.otherRoles).map((item, idx) => (
                          <div key={`${selectedProfile.id}-rol-${idx}`} className="rounded-lg border border-indigo-900/60 bg-indigo-950/80 p-3 text-base font-medium text-slate-50 whitespace-pre-line">
                            {item}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-indigo-900/60 bg-indigo-950/80 p-3 text-sm font-medium text-indigo-100">
                          No especificado
                        </div>
                      )}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="requisitos" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {renderInfoBlock("Educacion", selectedProfile.education)}
                    {renderInfoBlock("Experiencia", selectedProfile.experience)}
                    {renderInfoBlock("Especialidad", selectedProfile.specialty)}
                    {renderInfoBlock("Experiencia Deseada", selectedProfile.desiredExp, true)}
                    {renderInfoBlock("Conocimientos", selectedProfile.knowledge, true)}
                    {renderInfoBlock("Habilidades", selectedProfile.skills, true)}
                    {renderInfoBlock("Idiomas", selectedProfile.languages, true)}
                    {renderInfoBlock("Atributos", selectedProfile.attributes, true)}
                    {renderInfoBlock("Sexo", selectedProfile.sex)}
                    {renderInfoBlock("Disponibilidad para Viajar", selectedProfile.travel)}
                  </div>
                </TabsContent>

                <TabsContent value="relaciones" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-indigo-950/80 p-4 rounded-xl border border-indigo-900/60/50">
                      <h4 className="text-sm font-bold text-indigo-200 mb-2 uppercase tracking-wider">Reporta a</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.reportsTo.length > 0 ? (
                          selectedProfile.reportsTo.map((report) => (
                            <Badge key={`${selectedProfile.id}-${report}`} variant="secondary" className="bg-indigo-900 text-indigo-200 border-indigo-700">
                              {report}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="bg-indigo-900 text-indigo-300 border-indigo-700">
                            Nivel raiz
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="bg-indigo-950/80 p-4 rounded-xl border border-indigo-900/60/50">
                      <h4 className="text-sm font-bold text-indigo-200 mb-2 uppercase tracking-wider">Subordinados</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.subordinates.length > 0 ? (
                          selectedProfile.subordinates.map((subordinate) => (
                            <Badge key={`${selectedProfile.id}-${subordinate}`} variant="secondary" className="bg-indigo-900 text-indigo-200 border-indigo-700">
                              {subordinate}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="bg-indigo-900 text-indigo-300 border-indigo-700">
                            Sin subordinados directos
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-indigo-950/80 p-4 rounded-xl border border-indigo-900/60/50">
                    <h4 className="text-sm font-bold text-indigo-200 mb-2 uppercase tracking-wider">Proceso SGC Relacionado</h4>
                    <p className="text-base font-medium text-slate-50">{selectedProfile.processId || "Sin proceso asignado"}</p>
                  </div>
                </TabsContent>

                <TabsContent value="documento" className="mt-4 space-y-4">
                  <div className="bg-indigo-950/80 p-4 rounded-xl border border-indigo-900/60/50 space-y-2">
                    <div className="flex items-center gap-2 text-blue-300">
                      <FolderKanban className="w-4 h-4" />
                      <p className="text-xs uppercase tracking-wider font-bold">Archivo fuente</p>
                    </div>
                    <p className="text-base font-medium text-slate-50 break-words">
                      {selectedProfile.file || "Sin documento PDF vinculado"}
                    </p>
                  </div>
                  <div className="bg-indigo-950/80 p-4 rounded-xl border border-indigo-900/60/50 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <Link2 className="w-4 h-4" />
                      <p className="text-xs uppercase tracking-wider font-bold">Referencia</p>
                    </div>
                    <p className="text-sm text-indigo-200">
                      Datos cargados desde la tabla <code>hr_profiles</code> por API.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 font-bold border border-indigo-500/30"
                  disabled={isGeneratingPDF}
                  onClick={async () => {
                    if (!selectedProfile) return;
                    setIsGeneratingPDF(true);
                    const tid = toast.loading("Generando PDF...");
                    try {
                      const { blob } = await generateJobProfilePDFFromView(selectedProfile);
                      // Open PDF in a new tab for viewing
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      setTimeout(() => URL.revokeObjectURL(url), 5000);
                      toast.success("Documento generado", { id: tid });
                    } catch {
                      toast.error("Error al generar PDF", { id: tid });
                    } finally {
                      setIsGeneratingPDF(false);
                    }
                  }}
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Ver PDF
                </Button>
                <Button variant="outline" className="border-indigo-700/50 text-indigo-100 hover:bg-indigo-800 hover:text-white font-bold bg-indigo-950/50">
                  <FileCheck className="w-4 h-4 mr-2" /> Editar Perfil
                </Button>
              </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-220px)] flex flex-col items-center justify-center text-indigo-400">
            <Users className="w-16 h-16 mb-4 opacity-20" />
            <p>No hay perfiles de RRHH disponibles para esta organizacion</p>
          </div>
        )}
      </div>
    </div>
  );
}



