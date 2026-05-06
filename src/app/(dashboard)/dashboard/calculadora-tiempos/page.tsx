"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Clock, Users, UserCheck, Info } from "lucide-react";
import { EXAMS } from "@/lib/exam-utils";
import { cn } from "@/lib/utils";

const EXAM_THEMES: Record<string, {
    primary: string; bg: string; border: string; glow: string; text: string; ring: string; solid: string;
}> = {
    starters: { primary: "#06b6d4", bg: "bg-cyan-50", border: "border-cyan-500", glow: "bg-cyan-500/20", text: "text-cyan-600", ring: "ring-cyan-500/20", solid: "bg-cyan-600" },
    movers: { primary: "#10b981", bg: "bg-emerald-50", border: "border-emerald-500", glow: "bg-emerald-500/20", text: "text-emerald-600", ring: "ring-emerald-500/20", solid: "bg-emerald-600" },
    flyers: { primary: "#8b5cf6", bg: "bg-violet-50", border: "border-violet-500", glow: "bg-violet-500/20", text: "text-violet-600", ring: "ring-violet-500/20", solid: "bg-violet-600" },
    ket: { primary: "#f59e0b", bg: "bg-amber-50", border: "border-amber-500", glow: "bg-amber-500/20", text: "text-amber-600", ring: "ring-amber-500/20", solid: "bg-amber-600" },
    pet: { primary: "#f43f5e", bg: "bg-rose-50", border: "border-rose-500", glow: "bg-rose-500/20", text: "text-rose-600", ring: "ring-rose-500/20", solid: "bg-rose-600" },
    fce: { primary: "#6366f1", bg: "bg-indigo-50", border: "border-indigo-500", glow: "bg-indigo-500/20", text: "text-indigo-600", ring: "ring-indigo-500/20", solid: "bg-indigo-600" },
};

const EXAM_DURATIONS: Record<string, { duration: number; capacity: number }> = {
    starters: { duration: 5, capacity: 1 },
    movers: { duration: 7, capacity: 1 },
    flyers: { duration: 9, capacity: 1 },
    ket: { duration: 12, capacity: 2 },
    pet: { duration: 14, capacity: 2 },
    fce: { duration: 16, capacity: 2 },
};

function formatMinutes(mins: number): string {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function timeToMinutes(time: string): number {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

function minutesToEndTime(startTime: string, mins: number): string {
    if (!startTime) return "";
    const [h, m] = startTime.split(":").map(Number);
    const date = new Date();
    date.setHours(h, m + mins, 0, 0);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type CalcMode = "capacity" | "time" | "examiners";

export default function CalculadoraPage() {
    const { t } = useI18n();
    const [selectedExamId, setSelectedExamId] = useState("starters");
    const [breakTime, setBreakTime] = useState<number | "">(0);
    const [mode, setMode] = useState<CalcMode>("capacity");

    const theme = EXAM_THEMES[selectedExamId] || EXAM_THEMES.starters;
    const examConfig = EXAM_DURATIONS[selectedExamId] ?? EXAM_DURATIONS["starters"];
    const breakMin = typeof breakTime === "number" ? breakTime : 0;
    const effectiveDur = examConfig.duration + breakMin;

    // Modes configuration
    const [m1TimeMode, setM1TimeMode] = useState<"min" | "range">("min");
    const [m1Minutes, setM1Minutes] = useState<number | "">("");
    const [m1Start, setM1Start] = useState("");
    const [m1End, setM1End] = useState("");
    const [m1Examiners, setM1Examiners] = useState<number | "">(1);

    const [m2Students, setM2Students] = useState<number | "">("");
    const [m2Examiners, setM2Examiners] = useState<number | "">(1);
    const [m2StartTime, setM2StartTime] = useState("");

    const [m3TimeMode, setM3TimeMode] = useState<"min" | "range">("min");
    const [m3Minutes, setM3Minutes] = useState<number | "">("");
    const [m3Start, setM3Start] = useState("");
    const [m3End, setM3End] = useState("");
    const [m3Students, setM3Students] = useState<number | "">("");

    const handleExamChange = (id: string) => setSelectedExamId(id);

    const m1Avail = m1TimeMode === "min" ? (typeof m1Minutes === "number" ? m1Minutes : 0) : (m1Start && m1End ? timeToMinutes(m1End) - timeToMinutes(m1Start) : 0);
    const m3Avail = m3TimeMode === "min" ? (typeof m3Minutes === "number" ? m3Minutes : 0) : (m3Start && m3End ? timeToMinutes(m3End) - timeToMinutes(m3Start) : 0);

    const m1Result = (m1Avail > 0 && typeof m1Examiners === "number" && m1Examiners > 0 && effectiveDur > 0) ? { total: Math.floor(m1Avail / effectiveDur) * m1Examiners * examConfig.capacity, spe: Math.floor(m1Avail / effectiveDur) } : null;
    const m2Result = (typeof m2Students === "number" && typeof m2Examiners === "number" && m2Students > 0 && m2Examiners > 0) ? { totalMin: Math.ceil(Math.ceil(m2Students / examConfig.capacity) / m2Examiners) * effectiveDur, ts: Math.ceil(m2Students / examConfig.capacity), endTime: m2StartTime ? minutesToEndTime(m2StartTime, Math.ceil(Math.ceil(m2Students / examConfig.capacity) / m2Examiners) * effectiveDur) : null, spe: Math.ceil(Math.ceil(m2Students / examConfig.capacity) / m2Examiners) } : null;
    const m3Result = (m3Avail > 0 && typeof m3Students === "number" && m3Students > 0) ? (() => {
        const maxSpe = Math.floor(m3Avail / effectiveDur);
        if (maxSpe <= 0) return { error: "Tiempo insuficiente." };
        return { needed: Math.ceil(Math.ceil(m3Students / examConfig.capacity) / maxSpe), maxSpe, totalReq: Math.ceil(m3Students / examConfig.capacity) };
    })() : null;

    const modes: { key: CalcMode; icon: typeof Users; label: string; desc: string }[] = [
        { key: "capacity", icon: Users, label: "Capacidad", desc: "¿Cuántos alumnos puedo evaluar?" },
        { key: "time", icon: Clock, label: "Tiempo", desc: "¿Cuánto tiempo necesito?" },
        { key: "examiners", icon: UserCheck, label: "Aplicadores", desc: "¿Cuántos aplicadores necesito?" },
    ];

    const inputCls = cn("bg-white border-2 h-11 font-bold text-sm rounded-xl text-slate-900 placeholder:text-slate-400 transition-all", theme.border, "focus:ring-4 focus:outline-none", theme.ring);

    return (
        <div className="space-y-4 max-w-6xl">
            <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("calculator.title") || "Calculadora de Tiempos"}</h2>
                <p className="text-sm text-slate-500 font-medium">Planificación de Speaking Exams.</p>
            </div>

            <Card className={cn("border-2 bg-white overflow-hidden shadow-xl transition-all duration-500", theme.border)}>
                <div className={cn("h-1.5 w-full transition-all duration-500", theme.solid)} />
                <CardContent className="p-0">
                    {/* Top config bar - Light Mode */}
                    <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                        <div className="flex items-center gap-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Examen</Label>
                            <Select value={selectedExamId} onValueChange={handleExamChange}>
                                <SelectTrigger className={cn("bg-white border-2 h-9 font-bold text-xs rounded-lg w-[160px] text-slate-900 shadow-sm", theme.border)}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                    {EXAMS.map((exam) => (
                                        <SelectItem key={exam.id} value={exam.id} className="font-bold text-slate-700">{exam.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">Transición</Label>
                            <div className="relative">
                                <Input
                                    type="number" min="0" value={breakTime}
                                    onChange={(e) => setBreakTime(e.target.value !== "" ? Number(e.target.value) : "")}
                                    className={cn("bg-white border-2 h-9 font-bold text-xs pr-10 rounded-lg w-[85px] text-slate-900", theme.border)}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">min</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: "Duración", value: `${examConfig.duration}m`, hl: false },
                                { label: "Efectiva", value: `${effectiveDur}m`, hl: true },
                                { label: "Sesión", value: `${examConfig.capacity} ${examConfig.capacity === 1 ? "alumno" : "alumnos"}`, hl: false },
                            ].map(({ label, value, hl }) => (
                                <div key={label} className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-[10px] font-bold shadow-sm transition-all duration-500",
                                    hl ? cn("text-white", theme.solid, theme.border) : "bg-white border-slate-100 text-slate-600"
                                )}>
                                    <span className={cn("uppercase tracking-widest", hl ? "text-white/80" : "text-slate-400")}>{label}</span>
                                    <span>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row">
                        {/* Sidebar - Mode Selector */}
                        <div className="lg:w-[200px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 p-4 flex lg:flex-col gap-2 bg-slate-50/30">
                            {modes.map(({ key, icon: Icon, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setMode(key)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 w-full text-left",
                                        mode === key
                                            ? cn("text-white shadow-lg", theme.solid)
                                            : "text-slate-400 hover:text-slate-600 hover:bg-white hover:shadow-sm"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 shrink-0 transition-colors", mode === key ? "text-white" : "text-slate-300")} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Main Interaction Area */}
                        <div className="flex-1 p-6 space-y-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{modes.find(m => m.key === mode)?.desc}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                {/* Left: Dynamic Inputs */}
                                <div className="space-y-5">
                                    {mode === "capacity" && (
                                        <>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tiempo disponible</Label>
                                                    <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                                        <button onClick={() => { setM1TimeMode("min"); setM1Start(""); setM1End(""); }} className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", m1TimeMode === "min" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>MINUTOS</button>
                                                        <button onClick={() => { setM1TimeMode("range"); setM1Minutes(""); }} className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", m1TimeMode === "range" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>RANGO</button>
                                                    </div>
                                                </div>
                                                {m1TimeMode === "min" ? (
                                                    <div className="relative">
                                                        <Input type="number" min="0" placeholder="Ej. 120" value={m1Minutes} onChange={(e) => setM1Minutes(e.target.value ? Number(e.target.value) : "")} className={cn(inputCls, "pr-12 text-lg")} />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">MIN</span>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input type="time" value={m1Start} onChange={(e) => setM1Start(e.target.value)} className={cn(inputCls, "text-center")} />
                                                        <Input type="time" value={m1End} onChange={(e) => setM1End(e.target.value)} className={cn(inputCls, "text-center")} />
                                                        {m1Avail > 0 && <div className={cn("col-span-2 text-center py-2 rounded-lg text-sm font-black", theme.bg, theme.text)}>{formatMinutes(m1Avail)} totales</div>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Número de Aplicadores</Label>
                                                <Input type="number" min="1" value={m1Examiners} onChange={(e) => setM1Examiners(e.target.value ? Number(e.target.value) : "")} className={cn(inputCls, "text-lg")} />
                                            </div>
                                        </>
                                    )}
                                    {mode === "time" && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alumnos</Label>
                                                    <Input type="number" min="1" placeholder="30" value={m2Students} onChange={(e) => setM2Students(e.target.value ? Number(e.target.value) : "")} className={cn(inputCls, "text-lg")} />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aplicadores</Label>
                                                    <Input type="number" min="1" placeholder="1" value={m2Examiners} onChange={(e) => setM2Examiners(e.target.value ? Number(e.target.value) : "")} className={cn(inputCls, "text-lg")} />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hora de inicio</Label>
                                                <Input type="time" value={m2StartTime} onChange={(e) => setM2StartTime(e.target.value)} className={cn(inputCls, "text-lg text-center")} />
                                            </div>
                                        </>
                                    )}
                                    {mode === "examiners" && (
                                        <>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total de alumnos</Label>
                                                <Input type="number" min="1" placeholder="50" value={m3Students} onChange={(e) => setM3Students(e.target.value ? Number(e.target.value) : "")} className={cn(inputCls, "text-lg")} />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tiempo disponible</Label>
                                                    <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                                        <button onClick={() => { setM3TimeMode("min"); setM3Start(""); setM3End(""); }} className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", m3TimeMode === "min" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>MINUTOS</button>
                                                        <button onClick={() => { setM3TimeMode("range"); setM3Minutes(""); }} className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", m3TimeMode === "range" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>RANGO</button>
                                                    </div>
                                                </div>
                                                {m3TimeMode === "min" ? (
                                                    <div className="relative">
                                                        <Input type="number" min="0" placeholder="180" value={m3Minutes} onChange={(e) => setM3Minutes(e.target.value ? Number(e.target.value) : "")} className={cn(inputCls, "pr-12 text-lg")} />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">MIN</span>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input type="time" value={m3Start} onChange={(e) => setM3Start(e.target.value)} className={cn(inputCls, "text-center")} />
                                                        <Input type="time" value={m3End} onChange={(e) => setM3End(e.target.value)} className={cn(inputCls, "text-center")} />
                                                        {m3Avail > 0 && <div className={cn("col-span-2 text-center py-2 rounded-lg text-sm font-black", theme.bg, theme.text)}>{formatMinutes(m3Avail)} totales</div>}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Right: Vibrant Result Card */}
                                <div className={cn("rounded-3xl p-8 flex flex-col justify-center items-center text-center min-h-[280px] shadow-2xl relative overflow-hidden transition-all duration-500", theme.solid)}>
                                    {/* Abstract background shapes for premium look */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-3xl" />

                                    {mode === "capacity" && (
                                        m1Result ? (
                                            <div className="relative z-10 space-y-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Capacidad Estimada</p>
                                                <div className="text-8xl font-black text-white tracking-tighter drop-shadow-lg">{m1Result.total}</div>
                                                <div className="text-xl font-black text-white/90 uppercase tracking-[0.2em]">ALUMNOS</div>
                                                <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-2xl text-[10px] font-bold text-white border border-white/20 inline-block">
                                                    {m1Result.spe} sesiones por aplicador
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 text-white/50">
                                                <div className="p-6 rounded-full bg-white/10 backdrop-blur-sm"><Calculator className="w-12 h-12" /></div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Ingresa los parámetros</p>
                                            </div>
                                        )
                                    )}
                                    {mode === "time" && (
                                        m2Result ? (
                                            <div className="relative z-10 space-y-4 text-white">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Tiempo Requerido</p>
                                                <div className="text-6xl font-black tracking-tighter drop-shadow-lg">{formatMinutes(m2Result.totalMin)}</div>
                                                {m2Result.endTime && (
                                                    <div className="bg-white text-slate-900 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
                                                        <Clock className={cn("w-5 h-5", theme.text)} />
                                                        <span className="text-lg font-black tracking-tight">Finaliza: {m2Result.endTime}</span>
                                                    </div>
                                                )}
                                                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{m2Result.ts} sesiones totales</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 text-white/50">
                                                <div className="p-6 rounded-full bg-white/10 backdrop-blur-sm"><Clock className="w-12 h-12" /></div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Ingresa los parámetros</p>
                                            </div>
                                        )
                                    )}
                                    {mode === "examiners" && (
                                        m3Result ? (
                                            "error" in m3Result ? (
                                                <div className="bg-white/20 p-6 rounded-2xl border border-white/30 text-white font-black text-sm">{m3Result.error}</div>
                                            ) : (
                                                <div className="relative z-10 space-y-4">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Personal Necesario</p>
                                                    <div className="text-8xl font-black text-white tracking-tighter drop-shadow-lg">{m3Result.needed}</div>
                                                    <div className="text-xl font-black text-white/90 uppercase tracking-[0.2em]">APLICADORES</div>
                                                    <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-2xl text-[10px] font-bold text-white border border-white/20 inline-block">
                                                        Capacidad max: {m3Result.maxSpe} exámenes/pers.
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 text-white/50">
                                                <div className="p-6 rounded-full bg-white/10 backdrop-blur-sm"><UserCheck className="w-12 h-12" /></div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Ingresa los parámetros</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
