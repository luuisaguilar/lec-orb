"use client";

import { useState } from "react";
import { 
  Users, 
  Search, 
  ChevronRight, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Globe, 
  FileText,
  UserCircle2,
  TrendingUp,
  FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HR_PROFILES, JobProfile } from "@/lib/data/hr";

export default function HRProfiles() {
  const [search, setSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<JobProfile | null>(HR_PROFILES[0]);

  const filteredProfiles = HR_PROFILES.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar List */}
      <Card className="w-full lg:w-80 bg-slate-900/40 border-slate-800 backdrop-blur-sm flex flex-col overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-lg font-outfit text-white">Perfiles de Puesto</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar puesto..."
              className="pl-9 bg-slate-950/50 border-slate-800 text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-1 py-2">
            {filteredProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group",
                  selectedProfile?.id === p.id 
                    ? "bg-primary text-white shadow-lg" 
                    : "hover:bg-slate-800/50 text-slate-400"
                )}
              >
                <div className={cn(
                  "p-2 rounded-md",
                  selectedProfile?.id === p.id ? "bg-white/20" : "bg-slate-800 group-hover:bg-slate-700"
                )}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.title}</p>
                  <p className="text-[10px] opacity-70 uppercase tracking-wider">{p.id}</p>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 shrink-0 transition-transform",
                  selectedProfile?.id === p.id ? "translate-x-1" : "opacity-0"
                )} />
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Profile Detail View */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {selectedProfile ? (
          <ScrollArea className="flex-1">
            <div className="space-y-6 pr-4">
              {/* Header Card */}
              <Card className="bg-slate-900/40 border-slate-800 border-l-4 border-l-primary backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 uppercase text-[10px]">
                          {selectedProfile.id}
                        </Badge>
                        {selectedProfile.processId && (
                          <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/5 uppercase text-[10px]">
                            PROCESO: {selectedProfile.processId}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-3xl font-bold text-white font-outfit">{selectedProfile.title}</h2>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4" /> {selectedProfile.education}
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
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reporta a:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.reportsTo.length > 0 ? (
                          selectedProfile.reportsTo.map(r => (
                            <Badge key={r} variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">
                              {r}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="bg-slate-800 text-slate-400">Nivel Raíz</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest border-b border-primary/20 pb-2">
                    <Target className="w-4 h-4" /> Misión del Puesto
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/20 p-4 rounded-xl border border-slate-800">
                    {selectedProfile.mission}
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest border-b border-primary/20 pb-2">
                    <TrendingUp className="w-4 h-4" /> Responsabilidades
                  </div>
                  <div className="text-slate-300 text-sm leading-relaxed bg-slate-900/20 p-4 rounded-xl border border-slate-800 whitespace-pre-line">
                    {selectedProfile.responsibilities}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-widest border-b border-blue-400/20 pb-2">
                    <GraduationCap className="w-4 h-4" /> Requisitos de Perfil
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                      <h4 className="text-xs font-bold text-slate-500 mb-2">CONOCIMIENTOS</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedProfile.knowledge || "No especificado"}</p>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                      <h4 className="text-xs font-bold text-slate-500 mb-2">HABILIDADES</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{selectedProfile.skills || "No especificado"}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-sm uppercase tracking-widest border-b border-purple-400/20 pb-2">
                    <Star className="w-4 h-4" /> Competencias y Otros
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                      <h4 className="text-xs font-bold text-slate-500 mb-2">IDIOMAS</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedProfile.languages || "N/A"}</p>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                      <h4 className="text-xs font-bold text-slate-500 mb-2">ATRIBUTOS</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{selectedProfile.attributes || "N/A"}</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Action Bar */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" className="border-slate-700 text-slate-400 hover:text-white">
                  <FileText className="w-4 h-4 mr-2" /> PDF / Excel
                </Button>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <FileCheck className="w-4 h-4 mr-2" /> Editar Perfil
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Users className="w-16 h-16 mb-4 opacity-20" />
            <p>Selecciona un perfil para ver los detalles</p>
          </div>
        )}
      </div>
    </div>
  );
}
