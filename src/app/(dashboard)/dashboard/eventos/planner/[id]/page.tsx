"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, FileText, Clock, Users, MapPin, Calculator, Download, Pencil, ChevronDown, ChevronUp, Info, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { AddEventSessionDialog } from "@/components/events/add-session-dialog";
import { EventCOEReport } from "@/components/events/event-coe-report";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// ── Helpers shared with calculator ──────────────────────────────────────────
function fmtMins(mins: number): string {
    if (mins <= 0) return '0 min';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? (m === 0 ? `${h} h` : `${h} h ${m} min`) : `${m} min`;
}
function timeToMins(t: string) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function addMins(t: string, add: number): string {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const total = h * 60 + m + add;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// ── CalculatorPanel ──────────────────────────────────────────────────────────
function CalculatorPanel({ initialExamType, initialCandidates, initialExaminers, initialStartTime }: {
    initialExamType: string;
    initialCandidates: number;
    initialExaminers: number;
    initialStartTime: string;
}) {
    const EXAM_DURATIONS: Record<string, { duration: number; capacity: number }> = {
        starters: { duration: 5, capacity: 1 }, movers: { duration: 7, capacity: 1 }, flyers: { duration: 9, capacity: 1 },
        ket: { duration: 12, capacity: 2 }, pet: { duration: 14, capacity: 2 }, fce: { duration: 16, capacity: 2 },
    };
    const EXAM_NAMES: Record<string, string> = {
        starters: 'Starters', movers: 'Movers', flyers: 'Flyers', ket: 'KET', pet: 'PET', fce: 'FCE',
    };

    const [exam, setExam] = useState(initialExamType.toLowerCase());
    const [breakTime, setBreakTime] = useState(0);
    const [open, setOpen] = useState(false);

    const cfg = EXAM_DURATIONS[exam] ?? EXAM_DURATIONS['starters'];
    const effDur = cfg.duration + breakTime;

    // Mode 1 — students from time
    const [m1Mins, setM1Mins] = useState<number | ''>(60);
    const [m1Start, setM1Start] = useState(initialStartTime || '09:00');
    const [m1End, setM1End] = useState('');
    const [m1Exams, setM1Exams] = useState(initialExaminers || 1);
    const [m1Mode, setM1Mode] = useState<'min' | 'range'>('min');

    // Mode 2 — end time from students
    const [m2Students, setM2Students] = useState<number | ''>(initialCandidates || '');
    const [m2Exams, setM2Exams] = useState(initialExaminers || 1);
    const [m2Start, setM2Start] = useState(initialStartTime || '09:00');

    // Mode 3 — examiners needed
    const [m3Students, setM3Students] = useState<number | ''>(initialCandidates || '');
    const [m3Mins, setM3Mins] = useState<number | ''>(60);
    const [m3Start, setM3Start] = useState(initialStartTime || '09:00');
    const [m3End, setM3End] = useState('');
    const [m3Mode, setM3Mode] = useState<'min' | 'range'>('min');

    const availM1 = m1Mode === 'min' ? (typeof m1Mins === 'number' ? m1Mins : 0) : (m1Start && m1End ? timeToMins(m1End) - timeToMins(m1Start) : 0);
    const availM3 = m3Mode === 'min' ? (typeof m3Mins === 'number' ? m3Mins : 0) : (m3Start && m3End ? timeToMins(m3End) - timeToMins(m3Start) : 0);

    let r1: { students: number; sessions: number } | null = null;
    if (availM1 > 0 && typeof m1Exams === 'number' && m1Exams > 0 && effDur > 0) {
        const sess = Math.floor(availM1 / effDur);
        r1 = { students: sess * m1Exams * cfg.capacity, sessions: sess };
    }

    let r2: { mins: number; end: string; sessions: number } | null = null;
    if (typeof m2Students === 'number' && typeof m2Exams === 'number' && m2Students > 0 && m2Exams > 0 && effDur > 0) {
        const totalSess = Math.ceil(m2Students / cfg.capacity);
        const sessPerExam = Math.ceil(totalSess / m2Exams);
        const totalMins = sessPerExam * effDur;
        r2 = { mins: totalMins, sessions: totalSess, end: m2Start ? addMins(m2Start, totalMins) : '' };
    }

    let r3: { examiners: number; maxSess: number } | { error: string } | null = null;
    if (availM3 > 0 && typeof m3Students === 'number' && m3Students > 0 && effDur > 0) {
        const maxSess = Math.floor(availM3 / effDur);
        if (maxSess > 0) { r3 = { examiners: Math.ceil(Math.ceil(m3Students / cfg.capacity) / maxSess), maxSess }; }
        else { r3 = { error: 'El tiempo disponible es menor a la duración de un examen.' }; }
    }

    const modeToggle = (mode: 'min' | 'range', set: (v: 'min' | 'range') => void) => (
        <div className="flex rounded-md border overflow-hidden text-xs">
            <button type="button" onClick={() => set('min')} className={cn('px-2 py-1 transition-colors', mode === 'min' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground')}>Min</button>
            <button type="button" onClick={() => set('range')} className={cn('px-2 py-1 transition-colors', mode === 'range' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground')}>Hora</button>
        </div>
    );

    return (
        <div className="border-t mt-0">
            <button type="button" className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors" onClick={() => setOpen(v => !v)}>
                <span className="flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Calculadora de Tiempos</span>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open && (
                <div className="px-6 pb-6 space-y-5">
                    {/* Global config */}
                    <div className="flex flex-wrap gap-4 items-end p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="space-y-1">
                            <Label className="text-xs">Examen</Label>
                            <Select value={exam} onValueChange={setExam}>
                                <SelectTrigger className="h-8 text-xs w-28 bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.keys(EXAM_DURATIONS).map(k => <SelectItem key={k} value={k} className="text-xs">{EXAM_NAMES[k] ?? k.toUpperCase()}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">Transición <span title="Tiempo entre candidatos"><Info className="h-3 w-3 text-muted-foreground" /></span></Label>
                            <div className="flex items-center gap-1">
                                <Input type="number" min={0} value={breakTime} onChange={e => setBreakTime(+e.target.value || 0)} className="h-8 w-16 text-xs bg-background" />
                                <span className="text-xs text-muted-foreground">min</span>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Duración efectiva: <strong>{effDur} min</strong> · Capacidad: <strong>{cfg.capacity} por sesión</strong>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Mode 1 */}
                        <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                            <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-500" /> Modo 1 — Cuántos alumnos entran</p>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Tiempo disponible</Label>
                                {modeToggle(m1Mode, setM1Mode)}
                            </div>
                            {m1Mode === 'min'
                                ? <Input type="number" min={0} value={m1Mins} onChange={e => setM1Mins(e.target.value !== '' ? +e.target.value : '')} className="h-8 text-xs" placeholder="Minutos" />
                                : <div className="grid grid-cols-2 gap-1">
                                    <Input type="time" value={m1Start} onChange={e => setM1Start(e.target.value)} className="h-8 text-xs" />
                                    <Input type="time" value={m1End} onChange={e => setM1End(e.target.value)} className="h-8 text-xs" />
                                </div>
                            }
                            <div className="space-y-1">
                                <Label className="text-xs">Evaluadores</Label>
                                <Input type="number" min={1} value={m1Exams} onChange={e => setM1Exams(+e.target.value || 1)} className="h-8 text-xs" />
                            </div>
                            {r1 ? (
                                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2 text-center">
                                    <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{r1.students}</p>
                                    <p className="text-[10px] text-blue-600 dark:text-blue-500">alumnos ({r1.sessions} sesiones c/u)</p>
                                </div>
                            ) : <div className="h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Ingresa datos</div>}
                        </div>

                        {/* Mode 2 */}
                        <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                            <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1"><Users className="h-3.5 w-3.5 text-amber-500" /> Modo 2 — Hora de término</p>
                            <div className="space-y-1">
                                <Label className="text-xs">Candidatos</Label>
                                <Input type="number" min={1} value={m2Students} onChange={e => setM2Students(e.target.value !== '' ? +e.target.value : '')} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Evaluadores</Label>
                                <Input type="number" min={1} value={m2Exams} onChange={e => setM2Exams(+e.target.value || 1)} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Hora inicio</Label>
                                <Input type="time" value={m2Start} onChange={e => setM2Start(e.target.value)} className="h-8 text-xs" />
                            </div>
                            {r2 ? (
                                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2 text-center">
                                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{r2.end || fmtMins(r2.mins)}</p>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-500">{r2.end ? `termina · ${fmtMins(r2.mins)} total` : 'total'}</p>
                                </div>
                            ) : <div className="h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Ingresa datos</div>}
                        </div>

                        {/* Mode 3 */}
                        <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                            <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1"><Calculator className="h-3.5 w-3.5 text-green-500" /> Modo 3 — Evaluadores necesarios</p>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Tiempo disponible</Label>
                                {modeToggle(m3Mode, setM3Mode)}
                            </div>
                            {m3Mode === 'min'
                                ? <Input type="number" min={0} value={m3Mins} onChange={e => setM3Mins(e.target.value !== '' ? +e.target.value : '')} className="h-8 text-xs" placeholder="Minutos" />
                                : <div className="grid grid-cols-2 gap-1">
                                    <Input type="time" value={m3Start} onChange={e => setM3Start(e.target.value)} className="h-8 text-xs" />
                                    <Input type="time" value={m3End} onChange={e => setM3End(e.target.value)} className="h-8 text-xs" />
                                </div>
                            }
                            <div className="space-y-1">
                                <Label className="text-xs">Candidatos</Label>
                                <Input type="number" min={1} value={m3Students} onChange={e => setM3Students(e.target.value !== '' ? +e.target.value : '')} className="h-8 text-xs" />
                            </div>
                            {r3 ? (
                                'error' in r3
                                    ? <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 rounded p-2 text-[10px] text-red-600">{r3.error}</div>
                                    : <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 text-center">
                                        <p className="text-2xl font-black text-green-700 dark:text-green-400">{r3.examiners}</p>
                                        <p className="text-[10px] text-green-600 dark:text-green-500">evaluadores ({r3.maxSess} sesiones c/u)</p>
                                    </div>
                            ) : <div className="h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Ingresa datos</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Shared exam configuration for duration calculations ──────────────────────
const EXAM_CONFIGS: Record<string, { duration: number, capacity: number, written_duration: number }> = {
    "starters": { duration: 5, capacity: 1, written_duration: 45 },
    "movers": { duration: 7, capacity: 1, written_duration: 60 },
    "flyers": { duration: 9, capacity: 1, written_duration: 75 },
    "ket": { duration: 12, capacity: 2, written_duration: 100 }, // Reading+Writing (60) + Listening (30) + admin (10)
    "pet": { duration: 14, capacity: 2, written_duration: 130 }, // Reading (45), Writing (45), Listening (35) + admin
    "fce": { duration: 16, capacity: 2, written_duration: 210 },
};

// ----------------------------------------------------------------
// SpeakingDateEditor — inline component for changing speaking_date
// ----------------------------------------------------------------
function SpeakingDateEditor({ session, eventId, onUpdated }: { session: any; eventId: string; onUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const speakingDate = session.speaking_date ? new Date(session.speaking_date + 'T12:00:00') : new Date(session.date + 'T12:00:00');
    const writtenDate = new Date(session.date + 'T12:00:00');
    const isDifferent = session.speaking_date && session.speaking_date !== session.date;

    const handleDateSelect = async (date: Date | undefined) => {
        if (!date) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/events/${eventId}/sessions/${session.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ speaking_date: format(date, 'yyyy-MM-dd') })
            });
            if (res.ok) { onUpdated(); setOpen(false); }
        } finally { setSaving(false); }
    };

    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Fecha Oral:</span>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors hover:border-primary/50 ${isDifferent ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-muted/50 border-border'
                        }`}>
                        <Pencil className="h-3 w-3" />
                        {format(speakingDate, "d MMM yyyy", { locale: es })}
                        {isDifferent && <span className="text-[10px] font-bold ml-1">(diferente al escrito)</span>}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2 border-b text-xs text-muted-foreground">
                        Examen escrito: <strong>{format(writtenDate, "d MMM yyyy", { locale: es })}</strong>
                    </div>
                    <CalendarPicker
                        mode="single"
                        selected={speakingDate}
                        onSelect={handleDateSelect}
                        disabled={saving}
                        locale={es}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

// ----------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------
export default function EventShellPlannerPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const [event, setEvent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCOEOpen, setIsCOEOpen] = useState(false);

    const fetchEventData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/v1/events/${eventId}`);
            if (response.ok) {
                const data = await response.json();
                setEvent(data.event);
            }
        } catch (error) {
            console.error("Error fetching event:", error);
            toast.error("Error al cargar los datos del evento");
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    const sessionsReady =
        !!event &&
        (event.sessions?.length ?? 0) > 0 &&
        event.sessions.every((session: any) => {
            const sessionStaff =
                event.staff?.filter((s: any) => s.session_id === session.id) || [];
            const sessionSlots =
                event.slots?.filter((s: any) => s.session_id === session.id) || [];

            // 1. Must have staff assigned to the session record
            if (sessionStaff.length === 0) return false;

            // 2. Must have slots generated
            if (sessionSlots.length === 0) return false;

            // 3. Every slot that is NOT a break must have an applicator assigned
            const unassignedSlots = sessionSlots.filter(
                (s: any) =>
                    !s.is_break &&
                    (!s.applicator_id || s.applicator_id === "none")
            );

            return unassignedSlots.length === 0;
        });

    const allStaffAssignmentsConfirmed = (event?.staff ?? []).every((s: any) => {
        const a = s.acknowledgment_status;
        if (a === "declined" || a === "pending") return false;
        return true;
    });

    const isReadyToPublish = Boolean(
        event && sessionsReady && allStaffAssignmentsConfirmed
    );

    const handlePublishEvent = async () => {
        if (!isReadyToPublish) {
            if (!sessionsReady) {
                toast.error(
                    "No se puede publicar el evento. Asegúrate de que todas las sesiones tengan personal y turnos completos."
                );
            } else if (!allStaffAssignmentsConfirmed) {
                toast.error(
                    "No se puede publicar hasta que todo el personal asignado confirme (o hasta corregir asignaciones rechazadas)."
                );
            }
            return;
        }
        try {
            const res = await fetch(`/api/v1/events/${eventId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "PUBLISHED" })
            });
            if (!res.ok) throw new Error("Error al publicar evento");
            toast.success("Evento publicado exitosamente. El staff ha sido notificado.");
            fetchEventData();
            setIsCOEOpen(true);
        } catch (error) {
            console.error(error);
            toast.error("Hubo un error al intentar publicar el evento.");
        }
    };

    const handleExportConsolidado = () => {
        if (!event) return;
        const sessions = event.sessions || [];
        const staffAll = event.staff || [];
        const slots = event.slots || [];

        const rows: string[][] = [];

        // Header section
        rows.push([`CONSOLIDADO DE EVENTO: ${event.title}`]);
        rows.push([`Sede: ${event.school?.name || '-'}`, `Ciudad: ${event.school?.city || '-'}`]);
        rows.push([`Estatus: ${event.status}`, `Horario sede: ${event.school?.operating_hours?.open || '-'} - ${event.school?.operating_hours?.close || '-'}`]);
        rows.push([]);

        // Per-session tables
        sessions.forEach((session: any) => {
            const params = session.parameters || {};
            const sessionStaff = staffAll.filter((s: any) => s.session_id === session.id || !s.session_id);
            const sessionSlots = slots.filter((sl: any) => sl.session_id === session.id);
            const totalCandidates = (session.classrooms || []).reduce((t: number, c: any) => t + (c.capacity || 0), 0);

            rows.push([`=== SESIÓN: ${session.exam_type.toUpperCase()} ===`]);
            rows.push([`Fecha Escrito`, session.date]);
            if (session.speaking_date && session.speaking_date !== session.date) {
                rows.push([`Fecha Oral (Speaking)`, session.speaking_date]);
            }
            rows.push([`Hora Inicio`, params.start_time || '-', `Candidatos`, String(totalCandidates), `Evaluadores`, String(params.examiners || 1)]);
            rows.push([]);

            // Classrooms
            rows.push([`  SALONES:`]);
            rows.push([`  Nombre`, `Capacidad`]);
            (session.classrooms || []).forEach((c: any) => {
                rows.push([`  ${c.name}`, String(c.capacity)]);
            });
            rows.push([]);

            // Assigned staff
            rows.push([`  PERSONAL ASIGNADO:`]);
            rows.push([`  Nombre`, `Rol`, `Zona`]);
            sessionStaff.forEach((s: any) => {
                const app = s.applicator;
                rows.push([
                    `  ${app?.name || s.applicator_id}`,
                    s.role,
                    app?.location_zone || '-'
                ]);
            });
            rows.push([]);

            // Timetable
            if (sessionSlots.length > 0) {
                rows.push([`  TIMETABLE:`]);
                rows.push([`  #`, `Componente`, `Inicio`, `Fin`, `Candidatos / Salón`, `Estado`]);
                sessionSlots
                    .sort((a: any, b: any) => (a.slot_number || 0) - (b.slot_number || 0))
                    .forEach((sl: any) => {
                        rows.push([
                            `  ${sl.slot_number}`,
                            sl.is_break ? 'RECESO' : sl.component,
                            sl.start_time || '',
                            sl.end_time || '',
                            (sl.candidates || []).join(', '),
                            sl.status || ''
                        ]);
                    });
            }
            rows.push([]);
            rows.push([`-------------------------------------------------------`]);
            rows.push([]);
        });

        const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `consolidado_${event.title.replace(/\s+/g, '_')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Consolidado exportado correctamente.');
    };

    useEffect(() => {
        fetchEventData();
    }, [fetchEventData]);

    if (isLoading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
    }

    if (!event) {
        return <div className="p-8 text-center text-destructive">Evento no encontrado.</div>;
    }

    const unassignedSessionsCount = event.sessions?.filter((s: any) => s.status !== 'PUBLISHED').length || 0;
    // Log unused var just to silence eslint during development phase
    console.debug('unassignedSessionsCount', unassignedSessionsCount);

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
            {/* Header: Event Shell Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => router.push("/dashboard/eventos")} className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium text-muted-foreground">Eventos › Planeación</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">{event.title}</h2>
                    <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md text-sm">
                            <MapPin className="h-4 w-4 text-primary" />
                            {event.school?.name}
                        </div>
                        <Badge variant={event.status === 'PUBLISHED' ? 'default' : 'secondary'} className="rounded-sm">
                            {event.status === 'PUBLISHED' ? "Publicado" : "Borrador (Planeación)"}
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <Dialog open={isCOEOpen} onOpenChange={setIsCOEOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                                <FileText className="h-4 w-4" /> Ver Vista General (COE)
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[98vw] w-full h-[95vh] overflow-y-auto p-0">
                            <DialogTitle className="sr-only">Reporte Confirmation of Entry (COE)</DialogTitle>
                            <EventCOEReport event={event} />
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={handleExportConsolidado} className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                        <Download className="h-4 w-4" /> Exportar Consolidado
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/institucional/documentos-eventos/${eventId}`)}
                        className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                    >
                        <FileText className="h-4 w-4" /> Abrir Docs & Resultados
                    </Button>
                    <AddEventSessionDialog eventId={eventId} onSessionAdded={fetchEventData} schoolHours={event?.school?.operating_hours} />
                </div>
            </div>

            {/* School Hours Notice */}
            {(event.school?.operating_hours?.open || event.school?.operating_hours?.close) && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg flex items-center gap-3 text-sm">
                    <Clock className="h-5 w-5 shrink-0" />
                    <p>
                        <strong>Horario de Operación de la Sede:</strong>{" "}
                        {event.school.operating_hours.open || "--:--"} a {event.school.operating_hours.close || "--:--"}.
                        Las sesiones deben planearse dentro de este margen.
                    </p>
                </div>
            )}

            {/* Sessions Dashboard (Summary View) */}
            <div className="space-y-8 mt-8">
                <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-muted-foreground" />
                    Resumen de Sesiones de Examen (Summary View)
                </h3>

                {(!event.sessions || event.sessions.length === 0) ? (
                    <div className="text-center py-16 bg-muted/20 border-2 border-dashed rounded-xl">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-medium text-foreground">Este evento aún no tiene exámenes asignados</h4>
                        <p className="text-muted-foreground text-sm max-w-[400px] mx-auto mt-2 mb-6">
                            Agrega sesiones de distintos niveles (PET, KET, Movers...) en diferentes fechas para este colegio.
                        </p>
                        <AddEventSessionDialog eventId={eventId} onSessionAdded={fetchEventData} schoolHours={event?.school?.operating_hours} />
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {event.sessions.map((session: any) => {
                            // Calculate Summary Data
                            const config = EXAM_CONFIGS[session.exam_type.toLowerCase()] || { duration: 15, capacity: 1, written_duration: 60 };
                            const params = session.parameters || {};

                            // Parse start time to block times
                            const [h, m] = (params.start_time || "09:00").split(':').map(Number);
                            const writtenStart = new Date(); writtenStart.setHours(h, m, 0, 0);
                            const writtenEnd = new Date(writtenStart.getTime() + config.written_duration * 60000);

                            // Simulating oral start after written (or could be concurrent depending on ordering, 
                            // but basic summary assumes written first for now, though drag and drop overrides this in detailed planner)
                            const speakingStart = new Date(writtenEnd.getTime() + (params.break_duration || 10) * 60000);
                            const speakingTotalMins = Math.ceil(params.candidates_count / config.capacity / (params.examiners || 1)) * config.duration;
                            const speakingEnd = new Date(speakingStart.getTime() + speakingTotalMins * 60000);

                            const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                            // Staff lookup: prefer event.staff filtered by session_id;
                            // fall back to any unlinked staff if none found per session
                            const sessionSpecificStaff = event.staff?.filter((s: any) => s.session_id === session.id) || [];
                            const staffForSession = sessionSpecificStaff.length > 0
                                ? sessionSpecificStaff
                                : (event.staff?.filter((s: any) => !s.session_id) || []);
                            // Evaluators/invigilators used in the old Written/Speaking staff list (removed in redesign)
                            // but kept here in case they're referenced elsewhere in this map block
                            const evaluators = staffForSession.filter((s: any) => s.role === 'EVALUATOR');
                            const invigilators = staffForSession.filter((s: any) => ['INVIGILATOR', 'SUPERVISOR', 'ADMIN'].includes(s.role));
                            // Suppress unused variable warnings
                            void evaluators; void invigilators;

                            return (
                                <Card key={session.id} className="overflow-hidden border-2 shadow-sm hover:border-primary/50 transition-colors">
                                    <div className="bg-primary/5 border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <Badge variant="default" className="text-sm px-2.5 py-0.5 rounded-full uppercase tracking-widest bg-primary/90">
                                                    {session.exam_type}
                                                </Badge>
                                                <span className="font-semibold text-lg">
                                                    {format(new Date(session.date + 'T00:00:00'), "EEEE, d 'de' MMMM, yyyy", { locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Users className="h-4 w-4" /> {params.candidates_count} Candidatos • {params.examiners} Evaluador(es)
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="secondary" onClick={() => router.push(`/dashboard/eventos/planner/${eventId}/sessions/${session.id}`)}>
                                                Generar / Ver Planner Detallado
                                            </Button>
                                        </div>
                                    </div>

                                    <CardContent className="p-0">
                                        {/* Split View: Written vs Oral */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">

                                            {/* WRITTEN BLOCK */}
                                            <div className="p-6 space-y-4 bg-muted/10">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold flex items-center gap-2 text-foreground/80">
                                                        <FileText className="h-5 w-5 text-blue-500" /> Evaluación Escrita
                                                    </h4>
                                                    <div className="text-sm font-semibold text-primary">{formatTime(writtenStart)} - {formatTime(writtenEnd)}</div>
                                                </div>

                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <p>• Duración Estimada: {config.written_duration} min</p>
                                                    <p>• Componentes: {session.component_order?.filter((c: any) => c.id !== 'speaking').map((c: any) => {
                                                        const labels: Record<string, string> = {
                                                            reading_writing: "Reading & Writing",
                                                            reading_use_of_english: "Reading & Use of English",
                                                            reading: "Reading",
                                                            writing: "Writing",
                                                            listening: "Listening"
                                                        };
                                                        return labels[c.id] || c.id;
                                                    }).join(', ') || 'Reading, Writing, Listening'}</p>
                                                </div>
                                            </div>

                                            {/* SPEAKING BLOCK */}
                                            <div className="p-6 space-y-4 bg-muted/10">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold flex items-center gap-2 text-foreground/80">
                                                        <Users className="h-5 w-5 text-emerald-500" /> Evaluación Oral (Speaking)
                                                    </h4>
                                                    <div className="text-sm font-semibold text-primary">{formatTime(speakingStart)} - {formatTime(speakingEnd)}</div>
                                                </div>

                                                {/* Speaking Date — may differ from written date */}
                                                <SpeakingDateEditor
                                                    session={session}
                                                    eventId={eventId}
                                                    onUpdated={fetchEventData}
                                                />

                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <p>• Duración por Pareja: {config.duration} min</p>
                                                    <p>• Bloque Total Estimado: {speakingTotalMins} min</p>
                                                </div>
                                            </div>

                                        </div>
                                    </CardContent>

                                    {/* Equipo de Trabajo Section */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <Users className="h-3.5 w-3.5" /> Equipo de Trabajo — Personal Asignado
                                            </h5>
                                            <Badge variant="outline" className="text-[10px] font-bold bg-background">
                                                {staffForSession.length} Miembros
                                            </Badge>
                                        </div>

                                        {staffForSession.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {staffForSession.map((s: any) => {
                                                    const roleLabel = s.role === 'EVALUATOR' ? 'EVALUADOR' :
                                                        (['INVIGILATOR', 'SUPERVISOR', 'APLICADOR'].includes(s.role) ? 'APLICADOR' : s.role);
                                                    const isEvaluator = s.role === 'EVALUATOR';
                                                    const isApplicator = ['INVIGILATOR', 'SUPERVISOR', 'APLICADOR'].includes(s.role);

                                                    return (
                                                        <div key={s.id} className="flex items-center gap-2 bg-background border px-2.5 py-1 rounded-full shadow-sm">
                                                            <span className="text-xs font-medium">{s.applicator?.name}</span>
                                                            <Badge className={cn(
                                                                "text-[9px] px-1.5 h-4 font-bold border-0",
                                                                isEvaluator ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" :
                                                                    isApplicator ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                                                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                            )}>
                                                                {roleLabel}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-destructive flex items-center gap-2 italic py-1">
                                                <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                                                No se ha pre-asignado personal para esta sesión.
                                            </div>
                                        )}
                                    </div>

                                    {/* Calculator Panel — pre-loaded with session data */}
                                    <CalculatorPanel
                                        initialExamType={session.exam_type}
                                        initialCandidates={params.candidates_count || 0}
                                        initialExaminers={params.examiners || 1}
                                        initialStartTime={params.start_time || ''}
                                    />
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-12 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/5">
                <p className="text-sm text-muted-foreground mb-4 font-medium">¿Necesitas agregar más niveles a este evento?</p>
                <AddEventSessionDialog 
                    eventId={eventId} 
                    onSessionAdded={fetchEventData} 
                    schoolHours={event?.school?.operating_hours} 
                />
            </div>

            <div className="mt-8 flex flex-col items-end gap-3">
                {!sessionsReady && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm font-medium bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        Todas las sesiones deben tener personal asignado y turnos listos para poder publicar.
                    </div>
                )}
                {sessionsReady && !allStaffAssignmentsConfirmed && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm font-medium bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        Falta confirmación del personal desde el portal: hay asignaciones pendientes o
                        rechazadas.
                    </div>
                )}
                {(isReadyToPublish || event.status === 'PUBLISHED') && (
                    <Button 
                        size="lg" 
                        className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20" 
                        onClick={handlePublishEvent}
                        disabled={event.status === 'PUBLISHED'}
                    >
                        <Send className="h-5 w-5" />
                        {event.status === 'PUBLISHED' ? "Publicado" : "Publicar Evento y Notificar Staff"}
                    </Button>
                )}
            </div>
        </div>
    );
}
