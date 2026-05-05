"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  File,
  FileText,
  Filter,
  FolderOpen,
  Image,
  Loader2,
  Trash2,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import { addYears, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  version?: string | null;
  document_type?: string | null;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
}

interface DocumentExplorerProps {
  hideHeader?: boolean;
  initialSearch?: string;
  className?: string;
}

type ReviewStatus = "Vigente" | "Por revisar" | "Vencido";

type ControlMetadata = {
  code: string;
  documentOwner: string;
  processOwner: string;
  lastReviewDate: Date;
  nextReviewDate: Date;
  status: ReviewStatus;
};

const STATUS_BADGE_CLASSES: Record<ReviewStatus, string> = {
  Vigente: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Por revisar": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Vencido: "bg-red-500/10 text-red-400 border-red-500/20",
};

function normalizeTagKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "");
}

function parseTagMap(tags: string[] | undefined) {
  const map = new Map<string, string>();
  for (const rawTag of tags ?? []) {
    const [left, ...rest] = rawTag.split(/[:=]/);
    if (!left || rest.length === 0) continue;
    const key = normalizeTagKey(left);
    const value = rest.join(":").trim();
    if (key && value && !map.has(key)) {
      map.set(key, value);
    }
  }
  return map;
}

function pickTagValue(map: Map<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalized = normalizeTagKey(key);
    const value = map.get(normalized);
    if (value) return value;
  }
  return null;
}

function parseDateValue(value: string | null | undefined) {
  if (!value) return null;
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;

  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

function humanizeSlug(slug: string | null | undefined) {
  if (!slug) return "General";
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function buildControlMetadata(doc: Document): ControlMetadata {
  const tagMap = parseTagMap(doc.tags);
  const fallbackDate = parseDateValue(doc.created_at) ?? new Date();

  const lastReviewTag = pickTagValue(tagMap, [
    "ultima_revision",
    "ultima revision",
    "last_review",
    "last review",
    "fecha_revision",
  ]);
  const nextReviewTag = pickTagValue(tagMap, [
    "proxima_revision",
    "proxima revision",
    "next_review",
    "next review",
    "fecha_proxima_revision",
  ]);

  const lastReviewDate = parseDateValue(lastReviewTag) ?? fallbackDate;
  const nextReviewDate = parseDateValue(nextReviewTag) ?? addYears(lastReviewDate, 1);

  const daysUntilReview = differenceInCalendarDays(nextReviewDate, new Date());
  let status: ReviewStatus = "Vigente";
  if (daysUntilReview < 0) {
    status = "Vencido";
  } else if (daysUntilReview <= 30) {
    status = "Por revisar";
  }

  const codeTag = pickTagValue(tagMap, ["codigo", "code", "doc_code", "document_code"]);
  const ownerTag = pickTagValue(tagMap, [
    "dueno_documento",
    "dueno",
    "document_owner",
    "owner",
    "responsable_documento",
  ]);
  const processOwnerTag = pickTagValue(tagMap, [
    "dueno_proceso",
    "process_owner",
    "owner_process",
    "responsable_proceso",
  ]);

  const code = codeTag ?? `${(doc.module_slug || "DOC").toUpperCase()}-${doc.id.slice(0, 8).toUpperCase()}`;
  const documentOwner = ownerTag ?? doc.uploaded_by_name ?? "Sin asignar";
  const processOwner = processOwnerTag ?? `Resp. ${humanizeSlug(doc.module_slug)}`;

  return {
    code,
    documentOwner,
    processOwner,
    lastReviewDate,
    nextReviewDate,
    status,
  };
}

function getFileIcon(mime: string) {
  if (mime?.startsWith("image/")) return Image;
  if (mime?.includes("pdf")) return FileText;
  return File;
}

function getFormatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDateLabel(date: Date) {
  return format(date, "d MMM yyyy", { locale: es });
}

export default function DocumentExplorer({
  hideHeader,
  initialSearch = "",
  className,
}: DocumentExplorerProps) {
  const [search, setSearch] = useState(initialSearch);
  const { data, mutate, isLoading } = useSWR("/api/v1/documents", fetcher);

  const enrichedDocs = useMemo(
    () => {
      const documents: Document[] = data?.documents ?? [];
      return documents.map((doc) => ({
        ...doc,
        control: buildControlMetadata(doc),
      }));
    },
    [data?.documents]
  );

  const filteredDocs = enrichedDocs.filter((doc) => {
    const s = search.toLowerCase();
    return (
      doc.file_name.toLowerCase().includes(s) ||
      doc.module_slug.toLowerCase().includes(s) ||
      doc.control.code.toLowerCase().includes(s) ||
      doc.control.documentOwner.toLowerCase().includes(s) ||
      (doc.document_type ?? "").toLowerCase().includes(s) ||
      doc.tags?.some((tag) => tag.toLowerCase().includes(s))
    );
  });

  const statusSummary = useMemo(() => {
    const base: Record<ReviewStatus, number> = {
      Vigente: 0,
      "Por revisar": 0,
      Vencido: 0,
    };

    for (const doc of filteredDocs) {
      base[doc.control.status] += 1;
    }
    return base;
  }, [filteredDocs]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este documento permanentemente?")) return;
    const res = await fetch(`/api/v1/documents?id=${id}`, { method: "DELETE" });
    if (res.ok) mutate();
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {!hideHeader && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-outfit text-2xl font-bold tracking-tight text-white">Lista Maestra de Documentos</h1>
              <p className="text-sm text-muted-foreground">Control documental centralizado por organizacion</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Input
              placeholder="Buscar por nombre, codigo, proceso o responsable..."
              className="border-slate-700 bg-slate-950/50 text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Vigentes: {statusSummary.Vigente}
            </Badge>
            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Por revisar: {statusSummary["Por revisar"]}
            </Badge>
            <Badge className="border-red-500/20 bg-red-500/10 text-red-400">
              <XCircle className="mr-1 h-3.5 w-3.5" /> Vencidos: {statusSummary.Vencido}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm">
        <Table className="min-w-[1250px]">
          <TableHeader className="bg-slate-950/60">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documento</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Codigo</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Revision</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dueno documento</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dueno proceso</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ult. revision</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prox. revision</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estatus</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tamano</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && filteredDocs.length === 0 && (
              <TableRow className="border-slate-800">
                <TableCell colSpan={11} className="py-14 text-center text-slate-400">
                  <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />
                  Cargando lista maestra...
                </TableCell>
              </TableRow>
            )}

            {!isLoading && filteredDocs.length === 0 && (
              <TableRow className="border-slate-800">
                <TableCell colSpan={11} className="py-14 text-center text-slate-500">
                  <FolderOpen className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  No se encontraron documentos para ese criterio.
                </TableCell>
              </TableRow>
            )}

            {filteredDocs.map((doc) => {
              const Icon = getFileIcon(doc.mime_type);
              return (
                <TableRow key={doc.id} className="border-slate-800 hover:bg-slate-800/30">
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="rounded-md border border-slate-800 bg-slate-950/50 p-2">
                        <Icon className="h-4 w-4 text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-primary/80">{humanizeSlug(doc.module_slug)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary">{doc.control.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-700 bg-slate-800/60 text-slate-300">
                      {doc.document_type || "General"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">Rev. {doc.version || "1.0"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <UserRound className="h-3.5 w-3.5 text-slate-500" />
                      {doc.control.documentOwner}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <UsersRound className="h-3.5 w-3.5 text-slate-500" />
                      {doc.control.processOwner}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">{formatDateLabel(doc.control.lastReviewDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                      {formatDateLabel(doc.control.nextReviewDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] font-bold", STATUS_BADGE_CLASSES[doc.control.status])}>
                      {doc.control.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">{getFormatSize(doc.file_size)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                        asChild
                      >
                        <a href={`/api/v1/documents/download?path=${encodeURIComponent(doc.file_path)}`} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
