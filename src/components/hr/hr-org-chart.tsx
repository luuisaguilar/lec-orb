"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Workflow,
  Download,
  ZoomIn,
  ZoomOut,
  Info,
  Building2,
  Edit3,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  User,
  Search,
  ChevronRight,
  Maximize2,
  Crosshair,
  X,
  Sliders,
  Loader2,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { buildHierarchy, OrgNode } from "@/lib/data/hr";
import { generateJobProfilePDF, uploadPDFToSGC } from "@/lib/utils/pdf-generator";
import { Cloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useSWR from "swr";

const profileSchema = z.object({
  role_title: z.string().min(1, "El título es requerido"),
  holder_name: z.string().optional(),
  area: z.string().min(1, "El área es requerida"),
  mission: z.string().optional(),
  responsibilities: z.string().or(z.array(z.string())).optional(),
  role_type: z.enum(["directive", "coordination", "operative"]),
  education: z.string().optional(),
  experience: z.string().optional(),
  languages: z.string().optional(),
  knowledge: z.string().optional(),
  process_id: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const NO_PROCESS_VALUE = "__none__";

async function parseApiResponse(response: Response) {
  if (response.ok) return response.json();
  const payload = await response.json().catch(() => ({}));
  throw new Error(payload?.error || "Error en la solicitud");
}

export default function HROrgChart() {

  const supabase = createClient();
  
  // 1. Get user/org context
  const { data: userData } = useSWR("/api/v1/users/me", (url) => fetch(url).then(r => r.json()));
  const orgId = userData?.organization?.id;

  // 2. Fetch HR profiles from Supabase
  const { data: profiles, error: fetchError, isLoading: dataLoading, mutate: mutateProfiles } = useSWR(
    orgId ? [`hr_profiles`, orgId] : null,
    async () => {
      const { data, error } = await supabase
        .from('hr_profiles')
        .select('*')
        .eq('org_id', orgId)
        .order('role_title', { ascending: true });
      
      if (error) {
        throw error;
      }
      return data;
    }
  );

  const { data: processes } = useSWR(
    orgId ? ['sgc_processes', orgId] : null,
    async () => {
      const { data, error } = await supabase
        .from('sgc_processes')
        .select('id, title')
        .eq('org_id', orgId);
      if (error) throw error;
      return data;
    }
  );

  const [hierarchy, setHierarchy] = useState<OrgNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState("");
  const [nodeWidth, setNodeWidth] = useState(256);
  const [showSizePanel, setShowSizePanel] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingSGC, setIsSavingSGC] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      role_title: "",
      holder_name: "",
      area: "",
      mission: "",
      responsibilities: "",
      role_type: "operative",
      education: "",
      experience: "",
      languages: "",
      knowledge: "",
    }
  });

  useEffect(() => {
    if (selectedNode) {
      form.reset({
        role_title: selectedNode.role,
        holder_name: selectedNode.name,
        area: selectedNode.area,
        mission: selectedNode.mission || "",
        responsibilities: Array.isArray(selectedNode.responsibilities) 
          ? selectedNode.responsibilities.join("\n") 
          : selectedNode.responsibilities || "",
        role_type: (selectedNode.type as any) || "operative",
        education: selectedNode.education || "",
        experience: selectedNode.experience || "",
        languages: selectedNode.languages || "",
        knowledge: selectedNode.knowledge || "",
        process_id: selectedNode.processId || NO_PROCESS_VALUE,
      });
    }
  }, [selectedNode, form]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update hierarchy when profiles are loaded
  useEffect(() => {
    if (profiles) {
      setHierarchy(buildHierarchy(profiles));
    }
  }, [profiles]);

  const handleNodeClick = (node: OrgNode) => {
    setSelectedNode(node);
    setSheetOpen(true);
    setIsEditing(false);
  };

  const handleSave = async (values: ProfileFormValues) => {
    if (!selectedNode || !orgId) return;
    
    setIsSaving(true);
    const toastId = toast.loading("Guardando cambios...");
    
    try {
      const normalizedProcessId =
        values.process_id && values.process_id !== NO_PROCESS_VALUE ? values.process_id : null;

      const response = await fetch("/api/v1/hr/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node_id: selectedNode.id,
          role_title: values.role_title,
          holder_name: values.holder_name || null,
          area: values.area,
          mission: values.mission || null,
          responsibilities: typeof values.responsibilities === "string"
            ? values.responsibilities.split("\n").filter((r) => r.trim())
            : values.responsibilities,
          role_type: values.role_type,
          requirements: {
            education: values.education || null,
            experience: values.experience || null,
            languages: values.languages || null,
            knowledge: values.knowledge || null,
          },
          process_id: normalizedProcessId,
        }),
      });
      await parseApiResponse(response);

      toast.success("Perfil actualizado correctamente", { id: toastId });
      await mutateProfiles();
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar cambios", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const recenter = useCallback(() => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  }, []);

  const fitToScreen = useCallback(() => {
    if (!canvasRef.current) return;
    const container = canvasRef.current.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const contentWidth = canvasRef.current.scrollWidth;
    const newZoom = Math.min(0.95, Math.max(0.4, (containerWidth / contentWidth) * 0.9));
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan with mouse drag on canvas background
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setIsDragging(false);

  if (!mounted) return null;

  const handleDownloadPDF = async (shouldSaveToSGC: boolean = false) => {
    if (!selectedNode || !orgId) return;
    
    if (shouldSaveToSGC) setIsSavingSGC(true);
    else setIsGenerating(true);

    const toastId = toast.loading(shouldSaveToSGC ? "Guardando en SGC..." : "Generando perfil de puesto...");
    
    try {
      const { blob, fileName } = await generateJobProfilePDF(selectedNode);
      
      if (shouldSaveToSGC) {
        const path = `profiles/${selectedNode.id}_${new Date().getTime()}.pdf`;
        await uploadPDFToSGC(supabase, blob, path);

        const updatePathResponse = await fetch("/api/v1/hr/profiles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            node_id: selectedNode.id,
            last_pdf_path: path,
          }),
        });
        await parseApiResponse(updatePathResponse);

        await mutateProfiles();

        toast.success("Documento guardado en SGC", { id: toastId });
      } else {
        // Open PDF in a new tab for viewing
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Revoke after a short delay to ensure the new tab has loaded it
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("Documento generado", { id: toastId });
      }
    } catch {
      toast.error(shouldSaveToSGC ? "Error al guardar en SGC" : "Error al generar el documento", { id: toastId });
    } finally {
      setIsGenerating(false);
      setIsSavingSGC(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "directive":   return <ShieldCheck className="w-5 h-5" />;
      case "coordination":return <Briefcase className="w-5 h-5" />;
      case "operative":   return <GraduationCap className="w-5 h-5" />;
      default:            return <Building2 className="w-5 h-5" />;
    }
  };

  const matchesSearch = (node: OrgNode): boolean => {
    if (!search.trim()) return false;
    const q = search.toLowerCase();
    return (
      node.role.toLowerCase().includes(q) ||
      node.name.toLowerCase().includes(q) ||
      node.area.toLowerCase().includes(q)
    );
  };

  const renderNode = (node: OrgNode) => {
    const isSelected = selectedNode?.id === node.id;
    const isMatch = matchesSearch(node);
    const isCompact = nodeWidth < 220;
    const nodePad = isCompact ? "p-3" : "p-5";

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div className="relative px-4">
          <button
            onClick={() => handleNodeClick(node)}
            style={{ width: `${nodeWidth}px` }}
            className={cn(
              "relative rounded-2xl border-2 transition-all duration-300 text-left shadow-xl hover:scale-[1.03] active:scale-95",
              nodePad,
              isSelected
                ? "bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)] ring-4 ring-blue-400/20"
                : isMatch
                ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40"
                : "bg-slate-900/80 border-slate-700 hover:border-blue-400/60 backdrop-blur-md",
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300",
                )}
              >
                {getIcon(node.type)}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] uppercase font-bold tracking-tight border",
                  isSelected
                    ? "border-white/30 text-white bg-white/10"
                    : node.type === "directive"
                    ? "border-blue-500/40 text-blue-300 bg-blue-500/10"
                    : node.type === "coordination"
                    ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                    : "border-slate-600 text-slate-300 bg-slate-800/50",
                )}
              >
                {node.area}
              </Badge>
            </div>

            <div className="space-y-1">
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest line-clamp-2",
                  isSelected ? "text-blue-100" : "text-slate-400",
                )}
              >
                {node.role}
              </p>
              <p
                className={cn(
                  "font-bold tracking-tight line-clamp-2",
                  isCompact ? "text-xs" : "text-sm",
                  isSelected ? "text-white" : "text-slate-100",
                )}
              >
                {node.name}
              </p>
            </div>

            {isSelected && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rotate-45 border-r border-b border-blue-400" />
            )}
          </button>
        </div>

        {node.children && node.children.length > 0 && (
          <div className={cn("flex relative", isCompact ? "mt-8 gap-4" : "mt-12 gap-8")}>
            <div className={cn("absolute left-1/2 w-px bg-slate-600", isCompact ? "top-[-32px] h-8" : "top-[-48px] h-12")} />
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-slate-600"
                style={{
                  left: `calc(${100 / node.children.length / 2}%)`,
                  right: `calc(${100 / node.children.length / 2}%)`,
                }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.id} className={cn("relative", isCompact ? "pt-8" : "pt-12")}>
                <div className={cn("absolute top-0 left-1/2 w-px bg-slate-600 -translate-x-1/2", isCompact ? "h-8" : "h-12")} />
                {renderNode(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="relative h-[calc(100vh-220px)] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
        {/* Floating Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap gap-2 justify-between pointer-events-none">
          <div className="flex gap-2 pointer-events-auto items-start">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700 shadow-2xl">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} title="Alejar zoom">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="px-2 text-xs font-bold text-slate-200 min-w-[44px] text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5" onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="Acercar zoom">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5" onClick={fitToScreen} title="Ajustar a pantalla">
                <Maximize2 className="w-4 h-4" />
                <span className="hidden md:inline text-xs">Ajustar</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5" onClick={recenter} title="Volver al centro">
                <Crosshair className="w-4 h-4" />
                <span className="hidden md:inline text-xs">Centrar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-2 hover:text-white hover:bg-slate-800 gap-1.5",
                  showSizePanel ? "bg-slate-800 text-white" : "text-slate-300",
                )}
                onClick={() => setShowSizePanel(s => !s)}
                title="Tamaño de las tarjetas"
              >
                <Sliders className="w-4 h-4" />
                <span className="hidden md:inline text-xs">Tamaño</span>
              </Button>
            </div>
            {/* Size Panel */}
            {showSizePanel && (
              <div className="p-3 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl flex items-center gap-3 min-w-[280px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tamaño</span>
                <input
                  type="range"
                  min={160}
                  max={360}
                  step={4}
                  value={nodeWidth}
                  onChange={(e) => setNodeWidth(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-xs font-bold text-white tabular-nums w-12 text-right">{nodeWidth}px</span>
              </div>
            )}
          </div>
          <div className="pointer-events-auto">
            <div className="flex items-center gap-2 p-1 pl-3 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700 shadow-2xl min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <Input
                placeholder="Buscar puesto, nombre o área..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 bg-transparent h-8 px-0 text-xs text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {search && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSearch("")}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          className={cn(
            "h-full w-full overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(30,58,138,0.15)_0%,_transparent_70%)]",
            isDragging ? "cursor-grabbing" : "cursor-grab",
            (dataLoading || !hierarchy) && "flex items-center justify-center"
          )}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {dataLoading ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Cargando Organigrama...
              </p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 shadow-2xl">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <p className="text-sm font-bold text-red-400 uppercase tracking-widest">
                Error al cargar datos
              </p>
            </div>
          ) : (!hierarchy || hierarchy.role === 'No Data') ? (
            <div className="flex flex-col items-center gap-6 text-center max-w-md animate-in fade-in zoom-in duration-500">
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-2xl backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <Building2 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sin Datos en la Organización</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  No se encontraron perfiles de puesto vinculados a tu organización. 
                  Esto ocurre comúnmente si el seed se ejecutó antes de crear la organización o con un ID diferente.
                </p>
                
                {orgId && (
                  <div className="mt-6 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-500 break-all">
                    ORG_ID: {orgId}
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  className="mt-6 w-full border-slate-700 hover:bg-slate-800 text-slate-300"
                  onClick={() => {
                    mutateProfiles();
                    window.location.reload();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Datos
                </Button>
              </div>
            </div>
          ) : (
            <div
              ref={canvasRef}
              className="flex justify-center items-start pt-32 pb-16 px-16 transition-transform duration-200 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "top center",
              }}
            >
              {renderNode(hierarchy)}
            </div>
          )}
        </div>

        {/* Hint footer */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-xl border border-slate-700 text-[11px] text-slate-400 shadow-xl pointer-events-none">
          Arrastra para mover · Click en un puesto para ver detalle
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) setIsEditing(false);
      }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-slate-950 border-l border-slate-800 p-0 flex flex-col h-screen max-h-screen min-h-0 overflow-hidden"
        >
          {selectedNode && (
            <>
              <SheetHeader className="p-6 pb-5 border-b border-slate-800 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-3 py-1">
                    SGC · CAPITAL HUMANO
                  </Badge>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-white"
                      onClick={() => handleDownloadPDF(false)}
                      disabled={isGenerating || isEditing}
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </Button>
                    {isEditing ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {!isEditing ? (
                  <div className="flex items-start gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-4 rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/30 ring-4 ring-blue-400/20 shrink-0">
                      <User className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-xl font-outfit font-bold text-white tracking-tight leading-tight mb-1 text-left">
                        {selectedNode.role}
                      </SheetTitle>
                      <p className="text-sm text-slate-300 font-medium">{selectedNode.name}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] uppercase font-bold">
                          {selectedNode.type}
                        </Badge>
                        <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold">
                          {selectedNode.area}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 animate-in fade-in slide-in-from-left-4 duration-300">
                    <SheetTitle className="text-lg font-bold text-white">Editar Perfil de Puesto</SheetTitle>
                    <p className="text-xs text-slate-400">Realiza cambios en la estructura y requisitos del puesto.</p>
                  </div>
                )}
              </SheetHeader>

              <ScrollArea className="flex-1 min-h-0 h-full overflow-y-auto">
                <div className="p-6">
                  {isEditing ? (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6 pb-12">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="role_title"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Título del Puesto</FormLabel>
                                <FormControl>
                                  <Input {...field} className="bg-slate-900 border-slate-800 text-white focus:ring-blue-500/50" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="holder_name"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Titular Actual</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Vacante / Por asignar" className="bg-slate-900 border-slate-800 text-white" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="area"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Área</FormLabel>
                                <FormControl>
                                  <Input {...field} className="bg-slate-900 border-slate-800 text-white" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="role_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nivel</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                                      <SelectValue placeholder="Seleccionar nivel" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="directive">Directivo</SelectItem>
                                    <SelectItem value="coordination">Coordinación</SelectItem>
                                    <SelectItem value="operative">Operativo</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="mission"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Misión del Puesto</FormLabel>
                              <FormControl>
                                <Textarea {...field} className="bg-slate-900 border-slate-800 text-white min-h-[100px] leading-relaxed" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="responsibilities"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Responsabilidades (una por línea)</FormLabel>
                              <FormControl>
                                <Textarea {...field} className="bg-slate-900 border-slate-800 text-white min-h-[150px] font-mono text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="process_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vínculo SGC (Proceso ISO)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                                    <SelectValue placeholder="Seleccionar proceso" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                  <SelectItem value={NO_PROCESS_VALUE}>Ninguno / General</SelectItem>
                                  {processes?.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] pt-2">Perfil y Requisitos</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {["education", "experience", "languages", "knowledge"].map((req) => (
                              <FormField
                                key={req}
                                control={form.control}
                                name={req as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-slate-500 text-[10px] font-bold uppercase">
                                      {req === "education" ? "Educación" : req === "experience" ? "Experiencia" : req === "languages" ? "Idiomas" : "Conocimientos"}
                                    </FormLabel>
                                    <FormControl>
                                      <Input {...field} className="bg-slate-900 border-slate-800 text-xs text-white" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1 border-slate-800 text-slate-400"
                            onClick={() => setIsEditing(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                            disabled={isSaving}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                            Guardar Cambios
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
                      {/* Último PDF Generado (Si existe) */}
                      {selectedNode.last_pdf_path && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Documento Oficial SGC</p>
                              <p className="text-xs text-slate-200">Ficha técnica actualizada</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            onClick={async () => {
                              const { data } = supabase.storage.from('sgc-documents').getPublicUrl(selectedNode.last_pdf_path!);
                              window.open(data.publicUrl, '_blank');
                            }}
                          >
                            Ver PDF
                          </Button>
                        </div>
                      )}

                      {/* Misión */}
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-400" />
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            Misión del Puesto
                          </h3>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                          <p className="text-sm text-slate-200 leading-relaxed font-medium italic">
                            &ldquo;{selectedNode.mission || "Sin misión definida en este perfil."}&rdquo;
                          </p>
                        </div>
                      </section>

                      {/* Vínculo SGC */}
                      {selectedNode.processId && (
                        <section className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Workflow className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                              Vínculo con Procesos SGC
                            </h3>
                          </div>
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                            <p className="text-xs text-emerald-400 font-bold">
                              Perteneciente al proceso: {selectedNode.processId}
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Este puesto es actor clave en la ejecución de los procedimientos de calidad asociados a {selectedNode.processId}.
                            </p>
                          </div>
                        </section>
                      )}

                      {/* Responsabilidades */}
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Workflow className="w-4 h-4 text-blue-400" />
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            Funciones y Responsabilidades
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {(Array.isArray(selectedNode.responsibilities)
                            ? selectedNode.responsibilities
                            : (selectedNode.responsibilities || "").split("\n")
                          )
                            .filter((r) => r.trim())
                            .map((res, i) => (
                              <div
                                key={i}
                                className="flex gap-3 p-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 transition-colors border border-slate-800"
                              >
                                <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                                <p className="text-sm text-slate-200 leading-relaxed">
                                  {res.trim()}
                                </p>
                              </div>
                            ))}
                        </div>
                      </section>

                      {/* Requisitos */}
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-400" />
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            Perfil y Requisitos
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Educación", value: selectedNode.education },
                            { label: "Experiencia", value: selectedNode.experience },
                            { label: "Especialidad", value: selectedNode.specialty },
                            { label: "Idiomas", value: selectedNode.languages },
                            { label: "Conocimientos", value: selectedNode.knowledge },
                          ].map((item) => (
                            <div key={item.label} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {item.label}
                              </span>
                              <p className="text-xs text-slate-100 font-semibold leading-snug">
                                {item.value || "N/A"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {!isEditing && (
                <div className="border-t border-slate-800 p-4 bg-slate-950/95 backdrop-blur-xl flex flex-col gap-2 shrink-0">
                  <div className="flex gap-2 w-full">
                    <Button 
                      variant="secondary" 
                      className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 font-bold h-11 rounded-xl"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 rounded-xl"
                      onClick={() => handleDownloadPDF(false)}
                      disabled={isGenerating || isSavingSGC}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      {isGenerating ? "Generando..." : "Ver PDF"}
                    </Button>
                  </div>
                  <Button 
                    variant="secondary"
                    className="w-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-bold h-11 rounded-xl"
                    onClick={() => handleDownloadPDF(true)}
                    disabled={isGenerating || isSavingSGC}
                  >
                    {isSavingSGC ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4 mr-2" />
                    )}
                    {isSavingSGC ? "Guardando..." : "Guardar en SGC (Nube)"}
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

    </>
  );
}
