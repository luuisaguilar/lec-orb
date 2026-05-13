"use client";

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Info, Printer, ShieldCheck, Mail, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventCOEReportProps {
  event: any;
}

export function EventCOEReport({ event }: EventCOEReportProps) {
  if (!event) return null;

  const handlePrint = () => {
    window.print();
  };

  const sessions = event.sessions || [];
  const staff = event.staff || [];

  return (
    <div className="print-container flex flex-col gap-6 w-full mx-auto p-4 md:p-8 bg-background print:p-0 print:max-w-none print:mx-0">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          [data-radix-portal] {
            position: static !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
      {/* Action Header (Hidden on print) */}
      <div className="flex justify-between items-center print:hidden bg-muted/30 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold">Vista Previa: Confirmación de Entry (COE)</h3>
            <p className="text-xs text-muted-foreground">Esta es la vista que recibirán los coordinadores de la escuela.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-none shadow-none print:shadow-none bg-white">
        <CardContent className="p-0 space-y-8">
          
          {/* Main Title Section */}
          <div className="text-center space-y-2 py-6 border-b-4 border-amber-600/20">
            <h1 className="text-2xl md:text-4xl font-black text-amber-700 uppercase tracking-tight">
              SEDE: {event.school?.name || "SIN NOMBRE"}
            </h1>
            <div className="flex items-center justify-center gap-4 text-muted-foreground font-medium uppercase text-xs tracking-widest">
                <span>{event.title}</span>
                <span>•</span>
                <span>{event.school?.city || "Ciudad"}</span>
            </div>
          </div>

          {/* Combined Tables Container */}
          <div className="flex flex-col gap-6 print:gap-4 print:border-none print:shadow-none">
            
            {/* ORAL EVALUATION ROW */}
            <div className="flex flex-col border rounded-xl overflow-hidden shadow-sm print:rounded-none opacity-100 relative">
              <div className="bg-amber-600 text-white p-4 text-center font-bold text-lg uppercase tracking-wider border-b">
                EVALUACIÓN ORAL
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-amber-100/50 text-amber-900 uppercase font-black">
                      <th className="p-3 border">Examen</th>
                      <th className="p-3 border">Alumnos</th>
                      <th className="p-3 border">Día</th>
                      <th className="p-3 border">Horario</th>
                      <th className="p-3 border">Speaking Examiner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session: any) => {
                      const sessionStaff = staff.filter((s: any) => s.session_id === session.id && s.role === 'EVALUATOR');
                      return (
                        <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 border font-bold uppercase">{session.exam_type}</td>
                          <td className="p-3 border text-center">{session.parameters?.candidates_count || 0}</td>
                          <td className="p-3 border capitalize">
                            {format(new Date((session.speaking_date || session.date) + 'T12:00:00'), "EEEE d MMM", { locale: es })}
                          </td>
                          <td className="p-3 border font-medium">
                            {session.parameters?.start_time || "09:00"}
                          </td>
                          <td className="p-3 border p-0">
                            <div className="flex flex-col">
                                {sessionStaff.length > 0 ? (
                                    sessionStaff.map((s: any) => (
                                        <div key={s.id} className={cn(
                                            "p-2 border-b last:border-0",
                                            (s.role === 'REMOTE' || s.applicator?.is_remote) && "bg-cyan-100 dark:bg-cyan-950/40 font-bold"
                                        )}>
                                            {s.applicator?.name} 
                                            {(s.role === 'REMOTE' || s.applicator?.is_remote) && <span className="text-[9px] ml-1 opacity-70">- REMOTO</span>}
                                        </div>
                                    ))
                                ) : <span className="p-2 italic text-muted-foreground">Pendiente</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* WRITTEN EVALUATION ROW */}
            <div className="flex flex-col border rounded-xl overflow-hidden shadow-sm print:rounded-none opacity-100 relative">
              <div className="bg-slate-800 text-white p-4 text-center font-bold text-lg uppercase tracking-wider border-b">
                EXAMEN ESCRITO
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 uppercase font-black">
                      <th className="p-3 border">EXAMEN</th>
                      <th className="p-3 border">Alumnos</th>
                      <th className="p-3 border">DÍA</th>
                      <th className="p-3 border">HORA</th>
                      <th className="p-3 border">PERSONAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session: any) => {
                      const sessionStaff = staff.filter((s: any) => s.session_id === session.id && ['INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'APLICADOR'].includes(s.role));
                      return (
                        <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 border font-bold uppercase">{session.exam_type}</td>
                          <td className="p-3 border text-center">{session.parameters?.candidates_count || 0}</td>
                          <td className="p-3 border capitalize">
                            {session.date ? (
                                <span className="bg-yellow-200 px-1 font-bold">
                                    {format(new Date(session.date + 'T12:00:00'), "EEEE d MMM", { locale: es }).toUpperCase()}
                                </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 border font-medium">
                            {session.parameters?.start_time || "09:00"}
                          </td>
                          <td className="p-3 border p-0">
                            <div className="flex flex-col">
                                {sessionStaff.length > 0 ? (
                                    sessionStaff.map((s: any) => (
                                        <div key={s.id} className="p-2 border-b last:border-0 truncate max-w-[150px]">
                                            {s.applicator?.name}
                                        </div>
                                    ))
                                ) : <span className="p-2 italic text-muted-foreground">Pendiente</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Info Section - Dynamic Requirement Blocks */}
          <div className="space-y-6 pt-4 border-t print:pt-6">
            <div className="flex items-center gap-2 text-amber-700 font-bold border-l-4 border-amber-600 pl-4 py-1">
                <Info className="h-5 w-5" />
                <h4 className="uppercase text-sm tracking-widest">Información y Logística para la Sede</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] leading-relaxed text-muted-foreground print:text-[11px]">
                {/* 1. Paper-based Instructions */}
                {sessions.some((s: any) => s.delivery_mode === 'PAPER' && ['ket', 'pet', 'fce'].includes(s.exam_type?.toLowerCase())) && (
                    <div className="space-y-3 bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <p className="font-bold text-slate-900 border-b pb-1">Exámenes en Papel (A2 Key, B1 Preliminary, B2 First)</p>
                        <div className="space-y-2">
                            <p><strong>Identificación:</strong> Identificación con foto original y vigente (Pasaporte, credencial escolar).</p>
                            <p><strong>Escritura:</strong> Pluma negra o azul (obligatoria para PET/FCE), lápiz B o HB, borrador y sacapuntas.</p>
                            <p><strong>Otros:</strong> Marcador de texto, pañuelos desechables y agua en botella transparente.</p>
                            <div className="text-[10px] mt-2 text-slate-500 italic p-2 bg-white rounded border">
                                <strong>Sede:</strong> Sin letreros en inglés, reloj con segundero visible, etiquetas de candidato en orden secuencial.
                                Audio audible desde cualquier punto del salón.
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Digital Instructions */}
                {sessions.some((s: any) => s.delivery_mode === 'DIGITAL') && (
                    <div className="space-y-3 bg-blue-50 p-5 rounded-xl border border-blue-200">
                        <p className="font-bold text-blue-900 border-b pb-1">Exámenes Digitales (A2 Key a C2 Proficiency)</p>
                        <div className="space-y-2">
                            <p><strong>Identificación:</strong> Identificación con foto original y vigente (Obligatoria para ingresar).</p>
                            <p><strong>Accesorios:</strong> Audífonos con cable y agua en botella transparente.</p>
                            <p className="text-[11px] italic">Se proporcionará papel en blanco y lápices para notas si el alumno lo solicita.</p>
                            <div className="text-[10px] mt-2 text-blue-600 font-medium p-2 bg-white rounded border">
                                <strong>Infraestructura:</strong> Internet estable, navegador Inspera Integrity Browser, espaciado de 1.25m entre monitores.
                                Equipos proporcionados exclusivamente por el centro.
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Young Learners Instructions */}
                {sessions.some((s: any) => ['starters', 'movers', 'flyers'].includes(s.exam_type?.toLowerCase())) && (
                    <div className="space-y-3 bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                        <p className="font-bold text-emerald-900 border-b pb-1">Young Learners (Starters, Movers, Flyers)</p>
                        <div className="space-y-2">
                            <p><strong>Identificación:</strong> No se requiere identificación física para estos niveles.</p>
                            <p><strong>Escritura:</strong> Pluma negra o azul, lápiz B o HB, borrador y sacapuntas.</p>
                            <p><strong>Colores:</strong> Lápices de colores OBLIGATORIOS (negro, azul, café, verde, gris, naranja, rosa, morado, rojo y amarillo).</p>
                            <div className="text-[10px] mt-2 text-emerald-600 p-2 bg-white rounded border">
                                <strong>Protocolo:</strong> Poster Notice to Candidates visible, pizarrón con info del examen, ambiente amigable y relajado.
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Speaking Protocol (Generic) */}
                {sessions.some((s: any) => s.component_order?.some((c: any) => c.id === 'speaking' || (typeof c === 'string' && c === 'speaking'))) && (
                    <div className="space-y-3 bg-amber-50 p-5 rounded-xl border border-amber-200">
                        <p className="font-bold text-amber-900 border-b pb-1">Protocolo para la Prueba de Speaking</p>
                        <div className="space-y-2">
                            <p><strong>Sala de Examen:</strong> Solo examinadores y candidatos; mobiliario cara a cara.</p>
                            <p><strong>Salas de Espera/Salida:</strong> Supervisadas, silencio absoluto y rutas separadas para evitar contacto.</p>
                            <div className="text-[10px] mt-2 text-amber-600 p-2 bg-white rounded border">
                                <strong>Remotos:</strong> Se exige internet de alta velocidad vía cable Ethernet para evitar latencia.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 border-t border-dashed">
                <p className="text-sm font-medium">Cualquier duda o aclaración:</p>
                <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Correo Institucional</span>
                    <span className="flex items-center gap-1 font-bold"><Users className="h-3 w-3" /> 662 337 55 19 (Solo llamadas)</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">Saludos cordiales, LEC Platform Team.</p>
            </div>
          </div>

        </CardContent>
      </Card>
      
      {/* Explicit Print Styles Hook */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-container, .print-container * {
            visibility: visible !important;
          }
          .print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
          /* Ensure Dialog and Overlays are hidden */
          [role="dialog"], .radix-dialog-overlay, [data-state="open"] {
             position: static !important;
             background: transparent !important;
             box-shadow: none !important;
             overflow: visible !important;
          }
          [data-radix-portal] {
            position: static !important;
          }
          @page {
            margin: 1.5cm;
            size: portrait;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
          .bg-muted\\/30, .bg-slate-50, .bg-blue-50, .bg-emerald-50, .bg-amber-50 {
             background-color: transparent !important;
             border: 1px solid #e2e8f0 !important;
          }
          .text-amber-700, .text-slate-900, .text-blue-900, .text-emerald-900, .text-amber-900 {
            color: black !important;
          }
          .bg-amber-600, .bg-slate-800 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: white !important;
          }
          /* Force hide the header buttons in print */
          .print\\:hidden {
             display: none !important;
          }
        }
      `}} />
    </div>
  );
}
