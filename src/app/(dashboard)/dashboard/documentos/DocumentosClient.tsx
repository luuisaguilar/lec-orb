"use client";

import { useI18n } from "@/lib/i18n";
import { FolderOpen, Search, Filter, Trash2, Download, FileText, Image, File } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
}

export default function DocumentosClient() {
    const { t } = useI18n();
    const [search, setSearch] = useState("");
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
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FolderOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Gestión de Documentos</h1>
                        <p className="text-muted-foreground">Explorador global de archivos y expedientes</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, módulo o tag..."
                        className="pl-9 bg-background"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                        <Filter className="h-4 w-4 mr-2" /> Filtrar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading}>
                        {isLoading ? "Cargando..." : "Actualizar"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDocs.length === 0 && !isLoading && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
                        <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground">No se encontraron documentos</p>
                    </div>
                )}

                {filteredDocs.map((doc) => {
                    const Icon = getFileIcon(doc.mime_type);
                    return (
                        <div key={doc.id} className="group flex flex-col bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all hover:shadow-md">
                            <div className="p-4 flex items-start gap-3">
                                <div className="p-2 bg-muted rounded-lg shrink-0">
                                    <Icon className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm truncate" title={doc.file_name}>
                                        {doc.file_name}
                                    </h3>
                                    <p className="text-[10px] uppercase font-bold text-primary/70 mt-0.5">
                                        {doc.module_slug}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</span>
                                        <span className="text-[10px] text-muted-foreground">•</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {doc.tags.length > 0 && (
                                <div className="px-4 pb-3 flex flex-wrap gap-1">
                                    {doc.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <div className="mt-auto border-t bg-muted/30 px-4 py-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                                    <a href={`/api/v1/documents/download?path=${encodeURIComponent(doc.file_path)}`} target="_blank">
                                        <Download className="h-3.5 w-3.5 mr-1" /> Descargar
                                    </a>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
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
