"use client";

import { useState } from "react";
import { Calculator, Users, Clock, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export function CalculatorPanel({ initialExamType, initialCandidates, initialExaminers, initialStartTime }: {
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

    const [exam, setExam] = useState((initialExamType || 'starters').toLowerCase());
    const [breakTime, setBreakTime] = useState(0);
    const [open, setOpen] = useState(false);

    const cfg = EXAM_DURATIONS[exam] ?? EXAM_DURATIONS['starters'] ?? { duration: 5, capacity: 1 };
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
            <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors" onClick={() => setOpen(v => !v)}>
                <span className="flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Calculadora de Tiempos</span>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-4">
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
                            Duración: <strong>{effDur} min</strong> · Capacidad: <strong>{cfg.capacity} por sesión</strong>
                        </div>
                    </div>

                    <Tabs defaultValue="1" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="1" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                                <Clock className="h-3.5 w-3.5 mr-1.5" /> Alumnos
                            </TabsTrigger>
                            <TabsTrigger value="2" className="text-xs data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">
                                <Users className="h-3.5 w-3.5 mr-1.5" /> Hora Fin
                            </TabsTrigger>
                            <TabsTrigger value="3" className="text-xs data-[state=active]:bg-green-500/10 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400">
                                <Calculator className="h-3.5 w-3.5 mr-1.5" /> Aplicadores
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-3">
                            {/* Mode 1 */}
                            <TabsContent value="1" className="mt-0">
                                <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                                    <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-500" /> 1 — Cuántos alumnos</p>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Tiempo</Label>
                                        {modeToggle(m1Mode, setM1Mode)}
                                    </div>
                                    {m1Mode === 'min'
                                        ? <Input type="number" min={0} value={m1Mins} onChange={e => setM1Mins(e.target.value !== '' ? +e.target.value : '')} className="h-8 text-xs bg-background" placeholder="Minutos" />
                                        : <div className="grid grid-cols-2 gap-1">
                                            <Input type="time" value={m1Start} onChange={e => setM1Start(e.target.value)} className="h-8 text-xs bg-background" />
                                            <Input type="time" value={m1End} onChange={e => setM1End(e.target.value)} className="h-8 text-xs bg-background" />
                                        </div>
                                    }
                                    <div className="space-y-1">
                                        <Label className="text-xs">Evaluadores</Label>
                                        <Input type="number" min={1} value={m1Exams} onChange={e => setM1Exams(+e.target.value || 1)} className="h-8 text-xs bg-background" />
                                    </div>
                                    {r1 ? (
                                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-4 text-center mt-4">
                                            <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{r1.students}</p>
                                            <p className="text-xs font-medium text-blue-600 dark:text-blue-500">alumnos ({r1.sessions} sesiones c/u)</p>
                                        </div>
                                    ) : <div className="h-20 bg-muted/50 border border-dashed rounded flex flex-col items-center justify-center text-xs text-muted-foreground mt-4"><Calculator className="h-5 w-5 mb-1 opacity-20" />Ingresa datos</div>}
                                </div>
                            </TabsContent>

                            {/* Mode 2 */}
                            <TabsContent value="2" className="mt-0">
                                <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                                    <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1"><Users className="h-3.5 w-3.5 text-amber-500" /> 2 — Hora fin</p>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Candidatos</Label>
                                        <Input type="number" min={1} value={m2Students} onChange={e => setM2Students(e.target.value !== '' ? +e.target.value : '')} className="h-8 text-xs bg-background" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Evaluadores</Label>
                                        <Input type="number" min={1} value={m2Exams} onChange={e => setM2Exams(+e.target.value || 1)} className="h-8 text-xs bg-background" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Hora inicio</Label>
                                        <Input type="time" value={m2Start} onChange={e => setM2Start(e.target.value)} className="h-8 text-xs bg-background" />
                                    </div>
                                    {r2 ? (
                                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-4 text-center mt-4">
                                            <p className="text-3xl font-black text-amber-700 dark:text-amber-400">{r2.end || fmtMins(r2.mins)}</p>
                                            <p className="text-xs font-medium text-amber-600 dark:text-amber-500">{r2.end ? `termina · ${fmtMins(r2.mins)} total` : 'total'}</p>
                                        </div>
                                    ) : <div className="h-20 bg-muted/50 border border-dashed rounded flex flex-col items-center justify-center text-xs text-muted-foreground mt-4"><Calculator className="h-5 w-5 mb-1 opacity-20" />Ingresa datos</div>}
                                </div>
                            </TabsContent>

                            {/* Mode 3 */}
                            <TabsContent value="3" className="mt-0">
                                <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                                    <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1"><Calculator className="h-3.5 w-3.5 text-green-500" /> 3 — Evaluadores</p>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Tiempo</Label>
                                        {modeToggle(m3Mode, setM3Mode)}
                                    </div>
                                    {m3Mode === 'min'
                                        ? <Input type="number" min={0} value={m3Mins} onChange={e => setM3Mins(e.target.value !== '' ? +e.target.value : '')} className="h-8 text-xs bg-background" placeholder="Minutos" />
                                        : <div className="grid grid-cols-2 gap-1">
                                            <Input type="time" value={m3Start} onChange={e => setM3Start(e.target.value)} className="h-8 text-xs bg-background" />
                                            <Input type="time" value={m3End} onChange={e => setM3End(e.target.value)} className="h-8 text-xs bg-background" />
                                        </div>
                                    }
                                    <div className="space-y-1">
                                        <Label className="text-xs">Candidatos</Label>
                                        <Input type="number" min={1} value={m3Students} onChange={e => setM3Students(e.target.value !== '' ? +e.target.value : '')} className="h-8 text-xs bg-background" />
                                    </div>
                                    {r3 ? (
                                        'error' in r3
                                            ? <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 rounded p-2 text-[10px] text-red-600 mt-4">{r3.error}</div>
                                            : <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-4 text-center mt-4">
                                                <p className="text-3xl font-black text-green-700 dark:text-green-400">{r3.examiners}</p>
                                                <p className="text-xs font-medium text-green-600 dark:text-green-500">evaluadores ({r3.maxSess} sess c/u)</p>
                                            </div>
                                    ) : <div className="h-20 bg-muted/50 border border-dashed rounded flex flex-col items-center justify-center text-xs text-muted-foreground mt-4"><Calculator className="h-5 w-5 mb-1 opacity-20" />Ingresa datos</div>}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
