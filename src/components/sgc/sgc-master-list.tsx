"use client";

import { useState } from "react";
import { 
  FileText, 
  Search, 
  Download, 
  Filter, 
  ExternalLink,
  History,
  FileSpreadsheet,
  FileBox
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SgcDocument {
  id: string;
  code: string;
  name: string;
  type: "Format" | "Procedure" | "Manual" | "Record";
  version: string;
  lastUpdate: string;
  status: "Active" | "Draft" | "Obsolete";
  process: string;
  format: "xlsx" | "docx" | "pdf";
}

const MOCK_DOCS: SgcDocument[] = [
  {
    id: "1",
    code: "LEC-RRHH-F-01",
    name: "Perfil de Puesto",
    type: "Format",
    version: "2.1",
    lastUpdate: "2024-03-15",
    status: "Active",
    process: "Recursos Humanos",
    format: "docx"
  },
  {
    id: "2",
    code: "LEC-SGC-M-01",
    name: "Manual de Calidad",
    type: "Manual",
    version: "5.0",
    lastUpdate: "2024-01-20",
    status: "Active",
    process: "SGC",
    format: "pdf"
  },
  {
    id: "3",
    code: "LEC-FIN-F-02",
    name: "Control de Caja Chica",
    type: "Format",
    version: "1.2",
    lastUpdate: "2024-04-10",
    status: "Active",
    process: "Finanzas",
    format: "xlsx"
  }
];

export default function SGCMasterList() {
  const [search, setSearch] = useState("");
  
  const filteredDocs = MOCK_DOCS.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.code.toLowerCase().includes(search.toLowerCase()) ||
    doc.process.toLowerCase().includes(search.toLowerCase())
  );

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "xlsx": return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      case "docx": return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
          <Input
            placeholder="Buscar por código, nombre o proceso..."
            className="pl-9 bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
          <Button className="bg-primary text-primary-foreground">
            <Download className="w-4 h-4 mr-2" /> Exportar Lista
          </Button>
        </div>
      </div>

      <Card className="bg-white dark:bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-950/50">
            <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Código</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Nombre del Documento</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Proceso</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Versión</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Estatus</TableHead>
              <TableHead className="text-right text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.map((doc) => (
              <TableRow key={doc.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:bg-slate-800/30 transition-colors group">
                <TableCell className="font-mono text-xs text-primary font-bold">{doc.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-700 transition-colors">
                      {getFormatIcon(doc.format)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{doc.type}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-slate-100 dark:bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                    {doc.process}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <History className="w-3 h-3" /> v{doc.version}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredDocs.length === 0 && (
          <div className="py-20 text-center text-slate-500 dark:text-slate-400">
            <FileBox className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No se encontraron documentos que coincidan con la búsqueda.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

