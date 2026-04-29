"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  History,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Save,
  Download,
  Calendar,
  User,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AUDIT_CLAUSES, DEFAULT_AUDIT, AuditItem } from "@/lib/data/hr";

let _carCounter = 0;

export default function HRAudit() {
  const [auditState, setAuditState] = useState<AuditItem[]>(DEFAULT_AUDIT);
  const [activeClause, setActiveClause] = useState("4");
  const [carList, setCarList] = useState<any[]>([]);

  const filteredItems = auditState.filter(a => a.id.startsWith(activeClause + '.'));
  
  const updateStatus = (id: string, status: AuditItem['status']) => {
    setAuditState(prev => prev.map(item => 
      item.id === id ? { ...item, status } : item
    ));
    
    if (status === 'noconf') {
      // Auto-generate CAR placeholder
      const item = auditState.find(a => a.id === id);
      if (item && !carList.find(c => c.findingId === id)) {
        const newCar = {
          id: `CAR-${String(++_carCounter).padStart(4, '0')}`,
          findingId: id,
          findingTitle: item.title,
          description: item.q,
          status: 'open',
          createdAt: new Date().toISOString()
        };
        setCarList([newCar, ...carList]);
      }
    }
  };

  const updateNotes = (id: string, notes: string) => {
    setAuditState(prev => prev.map(item => 
      item.id === id ? { ...item, notes } : item
    ));
  };

  const progress = Math.round((auditState.filter(a => a.status !== '').length / auditState.length) * 100);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar - Clauses */}
        <Card className="md:col-span-1 bg-slate-900/40 border-slate-800 backdrop-blur-sm h-fit">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-outfit text-white uppercase tracking-widest flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Cláusulas ISO
            </CardTitle>
          </CardHeader>
          <div className="px-2 pb-4 space-y-1">
            {AUDIT_CLAUSES.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveClause(c.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between",
                  activeClause === c.id 
                    ? "bg-primary text-white" 
                    : "text-slate-400 hover:bg-slate-800/50"
                )}
              >
                <span>{c.id}. {c.name}</span>
                {activeClause === c.id && <ChevronRight className="w-3 h-3" />}
              </button>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-800 px-2">
              <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold mb-2">
                <span>Avance Auditoría</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="bg-slate-950/50 border border-slate-800 h-auto p-1">
              <TabsTrigger value="checklist" className="data-[state=active]:bg-slate-800 text-xs py-1.5 px-4">
                <ClipboardCheck className="w-3.5 h-3.5 mr-2" /> Checklist
              </TabsTrigger>
              <TabsTrigger value="car" className="data-[state=active]:bg-slate-800 text-xs py-1.5 px-4">
                <ShieldAlert className="w-3.5 h-3.5 mr-2" /> Acciones Correctivas (CAR)
                {carList.length > 0 && (
                  <Badge className="ml-2 bg-red-500 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]">
                    {carList.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-slate-800 text-xs py-1.5 px-4">
                <History className="w-3.5 h-3.5 mr-2" /> Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="mt-4 space-y-4">
              {/* Audit Header Info */}
              <Card className="bg-slate-900/20 border-slate-800">
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auditor Líder</label>
                    <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded border border-slate-800">
                      <User className="w-3 h-3 text-primary" />
                      <input type="text" className="bg-transparent border-none text-xs text-slate-300 focus:outline-none w-full" placeholder="Nombre del auditor..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</label>
                    <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded border border-slate-800">
                      <Calendar className="w-3 h-3 text-primary" />
                      <input type="date" className="bg-transparent border-none text-xs text-slate-300 focus:outline-none w-full dark:[color-scheme:dark]" />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white text-xs h-9">
                      <Download className="w-3.5 h-3.5 mr-2" /> Generar Reporte PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Checklist Items */}
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="bg-slate-900/40 border-slate-800 group hover:border-slate-700 transition-all overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-bold font-outfit">{item.id}</span>
                            <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          </div>
                          <p className="text-xs text-slate-400">{item.q}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 items-start shrink-0">
                          {item.tags.map(t => (
                            <Badge key={t} variant="outline" className="text-[9px] bg-slate-950/50 border-slate-800 text-slate-500 py-0 h-5">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => updateStatus(item.id, 'cumple')}
                          className={cn(
                            "h-9 text-xs border-slate-800 hover:bg-green-500/10 hover:text-green-400",
                            item.status === 'cumple' && "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Cumple
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => updateStatus(item.id, 'noconf')}
                          className={cn(
                            "h-9 text-xs border-slate-800 hover:bg-red-500/10 hover:text-red-400",
                            item.status === 'noconf' && "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                          )}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-2" /> No Conformidad
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => updateStatus(item.id, 'oport')}
                          className={cn(
                            "h-9 text-xs border-slate-800 hover:bg-yellow-500/10 hover:text-yellow-400",
                            item.status === 'oport' && "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                          )}
                        >
                          <AlertCircle className="w-3.5 h-3.5 mr-2" /> Oportunidad
                        </Button>
                      </div>

                      <Textarea 
                        placeholder="Observaciones y evidencia encontrada..."
                        className="bg-slate-950/50 border-slate-800 text-xs min-h-[60px] focus-visible:ring-primary/30"
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="car" className="mt-4">
              <div className="space-y-4">
                {carList.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl">
                    <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                    <p className="text-slate-500 text-sm">No hay acciones correctivas abiertas.</p>
                  </div>
                ) : (
                  carList.map(car => (
                    <Card key={car.id} className="bg-slate-900/40 border-slate-800 overflow-hidden">
                      <CardHeader className="bg-slate-950/40 p-4 border-b border-slate-800 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">{car.id}</Badge>
                          <span className="text-xs font-bold text-slate-300">Hallazgo: {car.findingId}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
                          {new Date(car.createdAt).toLocaleDateString()}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">{car.findingTitle}</h4>
                          <p className="text-xs text-slate-400 italic">&quot;{car.description}&quot;</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 mt-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Análisis Causa Raíz (5 Porqués)</label>
                            <Textarea placeholder="Describa la causa raíz..." className="bg-slate-950/30 border-slate-800 text-xs h-20" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plan de Acción y Responsable</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="Responsable..." className="bg-slate-950/30 border-slate-800 text-xs h-8" />
                              <Input type="date" className="bg-slate-950/30 border-slate-800 text-xs h-8 dark:[color-scheme:dark]" />
                            </div>
                            <Textarea placeholder="Acciones específicas..." className="bg-slate-950/30 border-slate-800 text-xs h-20 mt-2" />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-xs">
                            <Save className="w-3.5 h-3.5 mr-2" /> Guardar Avance
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card className="bg-slate-900/40 border-slate-800 h-80 flex items-center justify-center text-slate-500 italic text-sm">
                No hay registros de auditorías pasadas en este sistema.
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
