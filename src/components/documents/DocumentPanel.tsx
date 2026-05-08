"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { FileText, Image, File, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Document {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    tags: string[];
    created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentList — displays files attached to a module record
// ─────────────────────────────────────────────────────────────────────────────

export function DocumentList({
    moduleSlug,
    recordId,
    tag,
    title = "Documentos adjuntos",
    canDelete = false,
}: {
    moduleSlug: string;
    recordId?: string;
    tag?: string;
    title?: string;
    canDelete?: boolean;
}) {
    const url = `/api/v1/documents?module=${moduleSlug}${recordId ? `&record_id=${recordId}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;
    const { data, mutate } = useSWR(url, fetcher);
    const documents: Document[] = data?.documents ?? [];

    const handleDelete = async (docId: string) => {
        if (!confirm("¿Eliminar este documento?")) return;
        await fetch(`/api/v1/documents?id=${docId}`, { method: "DELETE" });
        mutate();
    };

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

    if (documents.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
            <div className="flex flex-col gap-1.5">
                {documents.map((doc) => {
                    const Icon = getFileIcon(doc.mime_type);
                    return (
                        <div
                            key={doc.id}
                            className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 hover:border-primary/30 transition-colors"
                        >
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{doc.file_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</span>
                                    {doc.tags?.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs py-0 px-1">{tag}</Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar" asChild>
                                    <a href={`/api/v1/documents/download?path=${encodeURIComponent(doc.file_path)}`} target="_blank">
                                        <Download className="h-3.5 w-3.5" />
                                    </a>
                                </Button>
                                {canDelete && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(doc.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentUpload — dropzone component for uploading files
// ─────────────────────────────────────────────────────────────────────────────

export function DocumentUpload({
    moduleSlug,
    recordId,
    defaultTags = [],
    onUpload,
}: {
    moduleSlug: string;
    recordId?: string;
    defaultTags?: string[];
    onUpload?: () => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const uploadFiles = async (files: FileList | File[]) => {
        setError(null);
        setUploading(true);
        try {
            const fileArray = Array.from(files);
            for (const file of fileArray) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("module_slug", moduleSlug);
                if (recordId) formData.append("record_id", recordId);
                if (defaultTags.length > 0) formData.append("tags", defaultTags.join(","));

                const res = await fetch("/api/v1/documents", { method: "POST", body: formData });
                if (!res.ok) {
                    const json = await res.json();
                    setError(json.error ?? `Error al subir ${file.name}`);
                    break;
                }
            }
            onUpload?.();
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) uploadFiles(e.target.files);
        e.target.value = "";
    };

    return (
        <div className="flex flex-col gap-2">
            <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors
                    ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40"}
                    ${uploading ? "opacity-60 pointer-events-none" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">
                    {uploading ? "Subiendo..." : "Arrastra archivos o haz clic para subir"}
                </p>
                <input ref={inputRef} type="file" multiple className="hidden" onChange={handleInput} />
            </div>
            {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{error}</p>
            )}
        </div>
    );
}
