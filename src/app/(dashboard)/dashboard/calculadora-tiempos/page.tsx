"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Clock, Users, UserCheck, Info } from "lucide-react";
import { EXAMS } from "@/lib/exam-utils";
import { cn } from "@/lib/utils";

const EXAM_THEMES: Record<string, {
    primary: string;
    bg: string;
    border: string;
    glow: string;
    text: string;
    ring: string;
}> = {
    starters: {
        primary: "#06b6d4", // cyan-500
        bg: "bg-cyan-500/5",
        border: "border-cyan-500/20",
        glow: "bg-cyan-500/10",
        text: "text-cyan-500",
        ring: "ring-cyan-500/20"
    },
    movers: {
        primary: "#10b981", // emerald-500
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/20",
        glow: "bg-emerald-500/10",
        text: "text-emerald-500",
        ring: "ring-emerald-500/20"
    },
    flyers: {
        primary: "#8b5cf6", // violet-500
        bg: "bg-violet-500/5",
        border: "border-violet-500/20",
        glow: "bg-violet-500/10",
        text: "text-violet-500",
        ring: "ring-violet-500/20"
    },
    ket: {
        primary: "#f59e0b", // amber-500
        bg: "bg-amber-500/5",
        border: "border-amber-500/20",
        glow: "bg-amber-500/10",
        text: "text-amber-500",
        ring: "ring-amber-500/20"
    },
    pet: {
        primary: "#f43f5e", // rose-500
        bg: "bg-rose-500/5",
        border: "border-rose-500/20",
        glow: "bg-rose-500/10",
        text: "text-rose-500",
        ring: "ring-rose-500/20"
    },
    fce: {
        primary: "#6366f1", // indigo-500
        bg: "bg-indigo-500/5",
        border: "border-indigo-500/20",
        glow: "bg-indigo-500/10",
        text: "text-indigo-500",
        ring: "ring-indigo-500/20"
    },
};

function ResultBox({ children, themeClass }: { children: React.ReactNode; themeClass?: string }) {
    return (
        <div className={cn(
            "bg-slate-950/40 backdrop-blur-xl rounded-3xl p-8 flex flex-col justify-center items-center text-center min-h-[280px] border-2 shadow-2xl relative overflow-hidden group transition-all duration-500",
            themeClass || "border-primary/20"
        )}>
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700">
                <Calculator className="w-24 h-24" />
            </div>
            <div className="relative z-10 w-full flex flex-col items-center">
                {children}
            </div>
        </div>
    );
}

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

function ToggleInput({ value, onChange }: {
    value: "minutes" | "timerange";
    onChange: (v: "minutes" | "timerange") => void;
}) {
    return (
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
            <button
                type="button"
                className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    value === "minutes" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onChange("minutes")}
            >
                Minutos
            </button>
            <button
                type="button"
                className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    value === "timerange" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onChange("timerange")}
            >
                Hora inicio – fin
            </button>
        </div>
    );
}

export default function CalculadoraPage() {
    const { t } = useI18n();
    const [selectedExamId, setSelectedExamId] = useState("starters");
    const [breakTime, setBreakTime] = useState<number | "">(0);

    const theme = EXAM_THEMES[selectedExamId] || EXAM_THEMES.starters;
    const examConfig = EXAM_DURATIONS[selectedExamId] ?? EXAM_DURATIONS["starters"];
    const breakMin = typeof breakTime === "number" ? breakTime : 0;
    const effectiveDur = examConfig.duration + breakMin;

    // Mode 1
    const [m1Mode, setM1Mode] = useState<"minutes" | "timerange">("minutes");
    const [m1Minutes, setM1Minutes] = useState<number | "">("");
    const [m1Start, setM1Start] = useState("");
    const [m1End, setM1End] = useState("");
    const [m1Examiners, setM1Examiners] = useState<number | "">(1);

    // Mode 2
    const [m2Students, setM2Students] = useState<number | "">("");
    const [m2Examiners, setM2Examiners] = useState<number | "">(1);
    const [m2StartTime, setM2StartTime] = useState("");

    // Mode 3
    const [m3Mode, setM3Mode] = useState<"minutes" | "timerange">("minutes");
    const [m3Minutes, setM3Minutes] = useState<number | "">("");
    const [m3Start, setM3Start] = useState("");
    const [m3End, setM3End] = useState("");
    const [m3Students, setM3Students] = useState<number | "">("");

    const handleExamChange = (id: string) => {
        setSelectedExamId(id);
        setM1Minutes(""); setM1Start(""); setM1End(""); setM1Examiners(1);
        setM2Students(""); setM2Examiners(1); setM2StartTime("");
        setM3Minutes(""); setM3Start(""); setM3End(""); setM3Students("");
    };

    // Resolve available minutes for modes 1 & 3
    const m1AvailMinutes = m1Mode === "minutes"
        ? (typeof m1Minutes === "number" ? m1Minutes : 0)
        : (m1Start && m1End ? timeToMinutes(m1End) - timeToMinutes(m1Start) : 0);

    const m3AvailMinutes = m3Mode === "minutes"
        ? (typeof m3Minutes === "number" ? m3Minutes : 0)
        : (m3Start && m3End ? timeToMinutes(m3End) - timeToMinutes(m3Start) : 0);

    // Calculations
    let m1Result = null;
    if (m1AvailMinutes > 0 && typeof m1Examiners === "number" && m1Examiners > 0 && effectiveDur > 0) {
        const sessionsPerExaminer = Math.floor(m1AvailMinutes / effectiveDur);
        const totalStudents = sessionsPerExaminer * m1Examiners * examConfig.capacity;
        m1Result = { totalStudents, sessionsPerExaminer };
    }

    let m2Result = null;
    if (typeof m2Students === "number" && typeof m2Examiners === "number" && m2Students > 0 && m2Examiners > 0) {
        const totalSessions = Math.ceil(m2Students / examConfig.capacity);
        const sessionsPerExaminer = Math.ceil(totalSessions / m2Examiners);
        const totalMinutes = sessionsPerExaminer * effectiveDur;
        const endTime = m2StartTime ? minutesToEndTime(m2StartTime, totalMinutes) : null;
        m2Result = { totalMinutes, totalSessions, endTime, sessionsPerExaminer };
    }

    let m3Result = null;
    if (m3AvailMinutes > 0 && typeof m3Students === "number" && m3Students > 0) {
        const maxSessionsPerExaminer = Math.floor(m3AvailMinutes / effectiveDur);
        if (maxSessionsPerExaminer > 0) {
            const totalSessionsRequired = Math.ceil(m3Students / examConfig.capacity);
            const examinersNeeded = Math.ceil(totalSessionsRequired / maxSessionsPerExaminer);
            m3Result = { examinersNeeded, maxSessionsPerExaminer, totalSessionsRequired };
        } else {
            m3Result = { error: "El tiempo disponible es menor a la duración de un solo examen." };
        }
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t("calculator.title") || "Calculadora de Tiempos"}</h2>
                <p className="text-muted-foreground mt-1">
                    Herramienta para planificar horarios de exámenes orales (Speaking).
                </p>
            </div>

            {/* Global config card */}
            <Card className={cn("border-2 transition-all duration-500 overflow-hidden relative", theme.border, theme.bg)}>
                <div className={cn("absolute top-0 left-0 w-full h-1", theme.text.replace("text-", "bg-"))} />
                <CardContent className="p-10">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-center">
                        {/* Exam selector + break */}
                        <div className="xl:col-span-5 relative group">
                            <div className={cn("absolute -inset-4 rounded-[2rem] transition-all duration-500 opacity-20", theme.bg)} />
                            <div className="relative flex flex-col sm:flex-row gap-6 w-full items-stretch p-2">
                                <div className="space-y-3 flex-1">
                                    <Label htmlFor="exam-select" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1 block text-center sm:text-left">Nivel del Examen</Label>
                                    <Select value={selectedExamId} onValueChange={handleExamChange}>
                                        <SelectTrigger id="exam-select" className={cn("bg-slate-950/60 border-2 transition-all h-14 font-black text-base px-6 rounded-2xl w-full backdrop-blur-sm", theme.border, "focus:ring-4", theme.ring)}>
                                            <SelectValue placeholder="Seleccione" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-950 border-slate-800 rounded-2xl shadow-2xl">
                                            {EXAMS.map((exam) => (
                                                <SelectItem key={exam.id} value={exam.id} className="font-bold py-3 focus:bg-primary/10">
                                                    {exam.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3 flex-1">
                                    <Label htmlFor="break-time" className="flex items-center justify-center sm:justify-start gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">
                                        Transición
                                        <Info className="h-3 w-3 opacity-40" />
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="break-time"
                                            type="number"
                                            min="0"
                                            value={breakTime}
                                            onChange={(e) => setBreakTime(e.target.value !== "" ? Number(e.target.value) : "")}
                                            className={cn("bg-slate-950/60 border-2 h-14 font-black text-lg pr-14 rounded-2xl transition-all w-full backdrop-blur-sm", theme.border, "focus:ring-4", theme.ring)}
                                        />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black opacity-25 uppercase tracking-widest">min</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stat pills */}
                        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                            {[
                                { 
                                    label: "Duración", 
                                    value: `${examConfig.duration} min`, 
                                    icon: Clock, 
                                },
                                { 
                                    label: "Efectiva", 
                                    value: `${effectiveDur} min`, 
                                    icon: Clock, 
                                    highlight: true
                                },
                                { 
                                    label: "Por Sesión", 
                                    value: `${examConfig.capacity} ${examConfig.capacity === 1 ? "Alumno" : "Alumnos"}`, 
                                    icon: Users, 
                                },
                            ].map(({ label, value, icon: Icon, highlight }) => (
                                <div key={label} className={cn(
                                    "rounded-3xl border-2 p-5 pb-4 flex flex-col gap-2 items-center text-center transition-all duration-500",
                                    highlight ? cn("bg-slate-900/90 shadow-2xl scale-105 z-10 border-opacity-60", theme.border) : "bg-slate-900/30 border-slate-800/40"
                                )}>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{label}</p>
                                    <p className={cn("text-xl font-black tracking-tight transition-colors duration-500 mb-2", highlight ? "text-white" : "text-slate-400")}>{value}</p>
                                    
                                    <div className={cn("p-2 rounded-2xl transition-all duration-500 shadow-inner mt-auto", highlight ? theme.bg : "bg-slate-800/20")}>
                                        <Icon className={cn("w-4 h-4 shrink-0 transition-colors duration-500", highlight ? theme.text : "text-slate-500/50")} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="mode1" className="w-full">
                <TabsList className="bg-slate-950/40 border-2 border-slate-900 p-1.5 mb-8 backdrop-blur-xl shadow-2xl rounded-2xl h-14">
                    {[
                        { id: "mode1", icon: Users, label: "Capacidad" },
                        { id: "mode2", icon: Clock, label: "Tiempo" },
                        { id: "mode3", icon: UserCheck, label: "Aplicadores" }
                    ].map((tab) => (
                        <TabsTrigger 
                            key={tab.id}
                            value={tab.id} 
                            className={cn(
                                "gap-3 transition-all duration-500 px-8 h-full rounded-xl font-black text-sm uppercase tracking-widest",
                                "data-[state=active]:shadow-lg data-[state=active]:border-2",
                                theme.text.replace("text-", "data-[state=active]:text-"),
                                theme.bg.replace("bg-", "data-[state=active]:bg-"),
                                theme.border.replace("border-", "data-[state=active]:border-")
                            )}
                        >
                            <tab.icon className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* MODE 1: CAPACITY */}
                <TabsContent value="mode1">
                    <Card className={cn("border-2 transition-all duration-500 overflow-hidden", theme.border, theme.bg.replace("/5", "/10"))}>
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black uppercase tracking-wider">Calcular Capacidad</CardTitle>
                            <CardDescription className="font-bold opacity-60">
                                ¿Cuántos alumnos puedo evaluar dado el tiempo y los aplicadores disponibles?
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Tiempo disponible</Label>
                                        <ToggleInput value={m1Mode} onChange={(v) => { setM1Mode(v); setM1Minutes(""); setM1Start(""); setM1End(""); }} />
                                        {m1Mode === "minutes" ? (
                                            <div className="relative group">
                                                <Input
                                                    type="number" min="0" placeholder="Ej. 120"
                                                    value={m1Minutes}
                                                    onChange={(e) => setM1Minutes(e.target.value ? Number(e.target.value) : "")}
                                                    className={cn("bg-slate-900/40 border-2 h-14 font-black text-lg pr-14 rounded-2xl transition-all", theme.border, "focus:ring-4", theme.ring)}
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black opacity-30">min</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Inicio</Label>
                                                    <Input type="time" value={m1Start} onChange={(e) => setM1Start(e.target.value)} className={cn("bg-slate-900/40 border-2 h-12 font-black rounded-xl", theme.border)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Fin</Label>
                                                    <Input type="time" value={m1End} onChange={(e) => setM1End(e.target.value)} className={cn("bg-slate-900/40 border-2 h-12 font-black rounded-xl", theme.border)} />
                                                </div>
                                                {m1AvailMinutes > 0 && (
                                                    <p className={cn("col-span-2 text-xs font-black uppercase tracking-wider text-center py-2 rounded-lg bg-white/5", theme.text)}>
                                                        {formatMinutes(m1AvailMinutes)} totales
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <Label htmlFor="m1-examiners" className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Número de aplicadores</Label>
                                        <Input
                                            id="m1-examiners" type="number" min="1" placeholder="1"
                                            value={m1Examiners}
                                            onChange={(e) => setM1Examiners(e.target.value ? Number(e.target.value) : "")}
                                            className={cn("bg-slate-900/40 border-2 h-14 font-black text-lg rounded-2xl transition-all", theme.border, "focus:ring-4", theme.ring)}
                                        />
                                    </div>
                                </div>
                                <ResultBox themeClass={theme.border}>
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Capacidad Estimada</h4>
                                    {m1Result ? (
                                        <div className="flex flex-col items-center">
                                            <div className="relative group/num">
                                                <div className={cn("absolute -inset-10 blur-3xl rounded-full transition-all duration-700 opacity-20 group-hover/num:opacity-40", theme.glow)} />
                                                <div className="relative text-8xl font-black text-white leading-none font-outfit tracking-tighter transition-all duration-500 group-hover/num:scale-110">
                                                    {m1Result.totalStudents}
                                                </div>
                                            </div>
                                            <div className={cn("text-2xl font-black mt-8 uppercase tracking-[0.2em] italic transition-colors duration-500", theme.text)}>alumnos</div>
                                            <div className="mt-8 h-px w-24 bg-slate-800" />
                                            <p className="text-xs font-black text-slate-400 mt-8 bg-slate-900/80 px-6 py-2.5 rounded-2xl border border-slate-800 uppercase tracking-widest shadow-inner">
                                                {m1Result.sessionsPerExaminer} sesiones p/ aplicador
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-slate-600 flex flex-col items-center gap-6 group/wait">
                                            <div className="p-6 rounded-3xl bg-slate-900/50 border-2 border-slate-800/50 group-hover/wait:border-primary/30 transition-all duration-500 group-hover/wait:scale-110">
                                                <Calculator className="w-12 h-12 opacity-20 group-hover/wait:opacity-50 transition-opacity" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Parámetros requeridos</p>
                                        </div>
                                    )}
                                </ResultBox>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MODE 2: TIME */}
                <TabsContent value="mode2">
                    <Card className={cn("border-2 transition-all duration-500 overflow-hidden", theme.border, theme.bg.replace("/5", "/10"))}>
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black uppercase tracking-wider">Calcular Tiempo</CardTitle>
                            <CardDescription className="font-bold opacity-60">
                                ¿Cuánto tiempo necesito para evaluar a un grupo de alumnos?
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Label htmlFor="m2-students" className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Total alumnos</Label>
                                            <Input
                                                id="m2-students" type="number" min="1" placeholder="Ej. 30"
                                                value={m2Students}
                                                onChange={(e) => setM2Students(e.target.value ? Number(e.target.value) : "")}
                                                className={cn("bg-slate-900/40 border-2 h-14 font-black text-lg rounded-2xl transition-all", theme.border, "focus:ring-4", theme.ring)}
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <Label htmlFor="m2-examiners" className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Aplicadores</Label>
                                            <Input
                                                id="m2-examiners" type="number" min="1" placeholder="1"
                                                value={m2Examiners}
                                                onChange={(e) => setM2Examiners(e.target.value ? Number(e.target.value) : "")}
                                                className={cn("bg-slate-900/40 border-2 h-14 font-black text-lg rounded-2xl transition-all", theme.border, "focus:ring-4", theme.ring)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <Label htmlFor="m2-start" className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Hora de inicio (opcional)</Label>
                                        <Input
                                            id="m2-start" type="time"
                                            value={m2StartTime}
                                            onChange={(e) => setM2StartTime(e.target.value)}
                                            className={cn("bg-slate-900/40 border-2 h-14 font-black rounded-2xl transition-all", theme.border, "focus:ring-4", theme.ring)}
                                        />
                                    </div>
                                </div>
                                <ResultBox themeClass={theme.border}>
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Tiempo Requerido</h4>
                                    {m2Result ? (
                                        <div className="flex flex-col items-center">
                                            <div className="relative group/num">
                                                <div className={cn("absolute -inset-10 blur-3xl rounded-full transition-all duration-700 opacity-20 group-hover/num:opacity-40", theme.glow)} />
                                                <div className="relative text-7xl font-black text-white leading-none font-outfit tracking-tighter transition-all duration-500 group-hover/num:scale-110">
                                                    {formatMinutes(m2Result.totalMinutes)}
                                                </div>
                                            </div>
                                            <div className={cn("text-2xl font-black mt-8 uppercase tracking-[0.2em] italic transition-colors duration-500", theme.text)}>minutos</div>
                                            
                                            {m2Result.endTime && (
                                                <div className="mt-8 text-xs font-black text-white bg-slate-900/80 px-8 py-3 rounded-2xl border border-slate-700/50 shadow-2xl flex items-center gap-3">
                                                    <Clock className={cn("w-4 h-4", theme.text)} />
                                                    FINALIZA: <span className={cn("text-lg", theme.text)}>{m2Result.endTime}</span>
                                                </div>
                                            )}
                                            
                                            <p className="text-[10px] font-black text-slate-500 mt-8 uppercase tracking-[0.2em]">
                                                {m2Result.totalSessions} sesiones · {m2Result.sessionsPerExaminer} p/ aplicador
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-slate-600 flex flex-col items-center gap-6 group/wait">
                                            <div className="p-6 rounded-3xl bg-slate-900/50 border-2 border-slate-800/50 group-hover/wait:border-primary/30 transition-all duration-500 group-hover/wait:scale-110">
                                                <Clock className="w-12 h-12 opacity-20 group-hover/wait:opacity-50 transition-opacity" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Parámetros requeridos</p>
                                        </div>
                                    )}
                                </ResultBox>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MODE 3: EXAMINERS */}
                <TabsContent value="mode3">
                    <Card className={cn("border-2 transition-all duration-500 overflow-hidden", theme.border, theme.bg.replace("/5", "/10"))}>
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black uppercase tracking-wider">Calcular Aplicadores</CardTitle>
                            <CardDescription className="font-bold opacity-60">
                                ¿Cuántos aplicadores necesito para evaluar a un grupo en un tiempo límite?
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Label htmlFor="m3-students" className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Total de alumnos</Label>
                                        <Input
                                            id="m3-students" type="number" min="1" placeholder="Ej. 50"
                                            value={m3Students}
                                            onChange={(e) => setM3Students(e.target.value ? Number(e.target.value) : "")}
                                            className={cn("bg-slate-900/40 border-2 h-14 font-black text-lg rounded-2xl transition-all", theme.border, "focus:ring-4", theme.ring)}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Tiempo disponible</Label>
                                        <ToggleInput value={m3Mode} onChange={(v) => { setM3Mode(v); setM3Minutes(""); setM3Start(""); setM3End(""); }} />
                                        {m3Mode === "minutes" ? (
                                            <div className="relative group">
                                                <Input
                                                    type="number" min="0" placeholder="Ej. 180"
                                                    value={m3Minutes}
                                                    onChange={(e) => setM3Minutes(e.target.value ? Number(e.target.value) : "")}
                                                    className={cn("bg-slate-900/40 border-2 h-14 font-black text-lg pr-14 rounded-2xl transition-all", theme.border, "focus:ring-4", theme.ring)}
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black opacity-30">min</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Inicio</Label>
                                                    <Input type="time" value={m3Start} onChange={(e) => setM3Start(e.target.value)} className={cn("bg-slate-900/40 border-2 h-12 font-black rounded-xl", theme.border)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Fin</Label>
                                                    <Input type="time" value={m3End} onChange={(e) => setM3End(e.target.value)} className={cn("bg-slate-900/40 border-2 h-12 font-black rounded-xl", theme.border)} />
                                                </div>
                                                {m3AvailMinutes > 0 && (
                                                    <p className={cn("col-span-2 text-xs font-black uppercase tracking-wider text-center py-2 rounded-lg bg-white/5", theme.text)}>
                                                        {formatMinutes(m3AvailMinutes)} totales
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <ResultBox themeClass={theme.border}>
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Personal Necesario</h4>
                                    {m3Result ? (
                                        "error" in m3Result ? (
                                            <div className="text-red-500 font-black p-6 bg-red-500/10 rounded-2xl border-2 border-red-500/20 uppercase tracking-widest text-center max-w-xs">
                                                {m3Result.error}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <div className="relative group/num">
                                                    <div className={cn("absolute -inset-10 blur-3xl rounded-full transition-all duration-700 opacity-20 group-hover/num:opacity-40", theme.glow)} />
                                                    <div className="relative text-8xl font-black text-white leading-none font-outfit tracking-tighter transition-all duration-500 group-hover/num:scale-110">
                                                        {m3Result.examinersNeeded}
                                                    </div>
                                                </div>
                                                <div className={cn("text-2xl font-black mt-8 uppercase tracking-[0.2em] italic transition-colors duration-500", theme.text)}>aplicadores</div>
                                                <div className="mt-8 h-px w-24 bg-slate-800" />
                                                <p className="text-xs font-black text-slate-400 mt-8 bg-slate-900/80 px-6 py-2.5 rounded-2xl border border-slate-800 uppercase tracking-widest shadow-inner">
                                                    {m3Result.totalSessionsRequired} sesiones · max {m3Result.maxSessionsPerExaminer} p/ aplicador
                                                </p>
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-slate-600 flex flex-col items-center gap-6 group/wait">
                                            <div className="p-6 rounded-3xl bg-slate-900/50 border-2 border-slate-800/50 group-hover/wait:border-primary/30 transition-all duration-500 group-hover/wait:scale-110">
                                                <UserCheck className="w-12 h-12 opacity-20 group-hover/wait:opacity-50 transition-opacity" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Parámetros requeridos</p>
                                        </div>
                                    )}
                                </ResultBox>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
