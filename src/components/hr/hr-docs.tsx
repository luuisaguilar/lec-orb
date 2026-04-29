"use client";

import { useState } from "react";
import { MASTER_DOCS, MasterDoc } from "@/lib/data/hr";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileDown, ExternalLink, Filter, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HRDocs() {
  const [search, setSearch] = useState("");

  const filteredDocs = MASTER_DOCS.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.id.toLowerCase().includes(search.toLowerCase()) ||
    doc.process.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: MasterDoc['status']) => {
    switch (status) {
      case 'vigente': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'obsoleto': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'en_revision': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl font-outfit text-white">Lista Maestra de Información Documentada</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Buscar documento..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-950/50 border-slate-800 text-white"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 font-bold">Código</TableHead>
                <TableHead className="text-slate-400 font-bold">Nombre del Documento</TableHead>
                <TableHead className="text-slate-400 font-bold">Tipo</TableHead>
                <TableHead className="text-slate-400 font-bold">Proceso</TableHead>
                <TableHead className="text-center text-slate-400 font-bold">Ver.</TableHead>
                <TableHead className="text-slate-400 font-bold">Estatus</TableHead>
                <TableHead className="text-right text-slate-400 font-bold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id} className="border-slate-800 hover:bg-slate-800/20 transition-colors">
                  <TableCell className="font-mono text-xs text-primary">{doc.id}</TableCell>
                  <TableCell className="text-white font-medium">{doc.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase border-slate-700 text-slate-400">
                      {doc.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{doc.process}</TableCell>
                  <TableCell className="text-center text-slate-400">{doc.version}</TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize", getStatusBadge(doc.status))}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDocs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No se encontraron documentos que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Filter className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Control de Cambios</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Toda modificación a los documentos de la lista maestra debe ser aprobada por el dueño del proceso y la Coordinación de Calidad antes de su publicación.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <ShieldAlert className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Información Confidencial</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              El acceso a los documentos está restringido según el perfil de puesto. Queda prohibida la reproducción parcial o total sin autorización.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
