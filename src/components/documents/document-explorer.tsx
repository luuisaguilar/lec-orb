"use client";

import { FolderOpen, Search, Filter, Trash2, Download, FileText, Image, File, Loader2, History, Calendar, FileType } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Document {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    tags: string[];
    module_slug: string;
    created_at: string;
    version?: string; // New field from migration
    document_type?: string; // New field from migration
}

interface DocumentExplorerProps {
    hideHeader?: boolean;
    initialSearch?: string;
    className?: string;
}

export default function DocumentExplorer({ hideHeader, initialSearch = "", className }: DocumentExplorerProps) {
    const [search, setSearch] = useState(initialSearch);
    const { data, mutate, isLoading } = useSWR("/api/v1/documents", fetcher);
    const documents: Document[] = data?.documents ?? [];

    const filteredDocs = documents.filter(doc =>
        doc.file_name.toLowerCase().includes(search.toLowerCase()) ||
        doc.module_slug.toLowerCase().includes(search.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    );

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const getFileExtension = (fileName: string) => {
        return fileName.split('.').pop()?.toUpperCase() || 'FILE';
    };

    const getFileIcon = (mime: string) => {
        if (mime?.startsWith("image/")) return Image;
        if (mime?.includes("pdf")) return FileText;
        return File;
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este documento permanentemente?")) return;
        const res = await fetch(`/api/v1/documents?id=${id}`, { method: "DELETE" });
        if (res.ok) mutate();
    };

    return (
        <div className={cn("flex flex-col gap-6", className)}>
            {!hideHeader && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FolderOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white font-outfit">Gestión de Documentos</h1>
                            <p className="text-muted-foreground text-sm">Explorador global de archivos y expedientes operativos</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-sm backdrop-blur-md">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nombre, módulo o tag..."
                        className="pl-9 bg-slate-950/50 border-slate-700 text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="hidden sm:flex border-slate-700 text-slate-400">
                        <Filter className="h-4 w-4 mr-2" /> Filtrar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading} className="border-slate-700 text-slate-300">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
                {filteredDocs.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-xl">
                        <FolderOpen className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No se encontraron documentos en el sistema</p>
                    </div>
                )}

                {isLoading && filteredDocs.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Sincronizando Lista Maestra...</p>
                  </div>
                )}

                {filteredDocs.map((doc) => {
                    const Icon = getFileIcon(doc.mime_type);
                    const ext = getFileExtension(doc.file_name);
                    
                    return (
                        <div key={doc.id} className="group flex flex-col bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden hover:border-primary/50 transition-all hover:shadow-xl backdrop-blur-sm relative">
                            {/* Version Badge Overlay */}
                            <div className="absolute top-2 right-2">
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-bold py-0 h-5">
                                    Rev. {doc.version || '1.0'}
                                </Badge>
                            </div>

                            <div className="p-4 flex items-start gap-3">
                                <div className="p-2.5 bg-slate-950/50 rounded-lg shrink-0 border border-slate-800">
                                    <Icon className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm truncate text-slate-100 pr-12" title={doc.file_name}>
                                        {doc.file_name}
                                    </h3>
                                    
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <p className="text-[10px] uppercase font-bold text-primary/80 tracking-wider">
                                          {doc.module_slug || 'General'}
                                      </p>
                                      <span className="text-[10px] text-slate-600">•</span>
                                      <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 rounded uppercase">
                                        <FileType className="w-2.5 h-2.5" /> {ext}
                                      </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5 mt-4">
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                                          <Calendar className="w-3 h-3 text-slate-600" />
                                          Creado: <span className="text-slate-300">{format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                                          <History className="w-3 h-3 text-slate-600" />
                                          Revisión: <span className="text-slate-300">{doc.version || '1.0'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                                          <div className="w-3 h-3 rounded-full border border-slate-600 flex items-center justify-center text-[7px] font-bold">i</div>
                                          Tamaño: <span className="text-slate-300">{formatSize(doc.file_size)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {doc.tags && doc.tags.length > 0 && (
                                <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                                    {doc.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-950/50 border-slate-800 text-slate-400">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <div className="mt-auto border-t border-slate-800 bg-slate-950/30 px-4 py-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/10" asChild>
                                    <a href={`/api/v1/documents/download?path=${encodeURIComponent(doc.file_path)}`} target="_blank">
                                        <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar
                                    </a>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() => handleDelete(doc.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
