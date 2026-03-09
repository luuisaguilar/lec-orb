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

function ResultBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-muted rounded-xl p-6 flex flex-col justify-center items-center text-center min-h-[200px]">
            {children}
        </div>
    );
}

export default function CalculadoraPage() {
    const { t } = useI18n();
    const [selectedExamId, setSelectedExamId] = useState("starters");
    const [breakTime, setBreakTime] = useState<number | "">(0);

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
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-end">
                        {/* Exam selector + break */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="exam-select">Examen</Label>
                                <Select value={selectedExamId} onValueChange={handleExamChange}>
                                    <SelectTrigger id="exam-select" className="bg-background">
                                        <SelectValue placeholder="Seleccione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXAMS.map((exam) => (
                                            <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="break-time" className="flex items-center gap-1">
                                    Transición
                                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="break-time"
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={breakTime}
                                        onChange={(e) => setBreakTime(e.target.value !== "" ? Number(e.target.value) : "")}
                                        className="bg-background"
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                                </div>
                            </div>
                        </div>

                        {/* Stat pills */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "Duración", value: `${examConfig.duration} min`, icon: Clock, highlight: false },
                                { label: "Efectiva", value: `${effectiveDur} min`, icon: Clock, highlight: true },
                                { label: "Por Sesión", value: `${examConfig.capacity} ${examConfig.capacity === 1 ? "Alumno" : "Alumnos"}`, icon: Users, highlight: false },
                            ].map(({ label, value, icon: Icon, highlight }) => (
                                <div key={label} className={cn(
                                    "rounded-lg border p-3 flex flex-col gap-1 bg-background",
                                    highlight && "border-primary/40 bg-primary/5"
                                )}>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                                    <p className={cn("text-lg font-bold flex items-center gap-1.5", highlight && "text-primary")}>
                                        <Icon className="w-4 h-4 shrink-0" />
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="mode1" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="mode1" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Users className="w-4 h-4 shrink-0" />
                        <span className="font-semibold hidden sm:inline">Capacidad</span>
                    </TabsTrigger>
                    <TabsTrigger value="mode2" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="font-semibold hidden sm:inline">Tiempo</span>
                    </TabsTrigger>
                    <TabsTrigger value="mode3" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <UserCheck className="w-4 h-4 shrink-0" />
                        <span className="font-semibold hidden sm:inline">Aplicadores</span>
                    </TabsTrigger>
                </TabsList>

                {/* MODE 1: CAPACITY */}
                <TabsContent value="mode1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Calcular Capacidad</CardTitle>
                            <CardDescription>
                                ¿Cuántos alumnos puedo evaluar dado el tiempo y los aplicadores disponibles?
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Tiempo disponible</Label>
                                        <ToggleInput value={m1Mode} onChange={(v) => { setM1Mode(v); setM1Minutes(""); setM1Start(""); setM1End(""); }} />
                                        {m1Mode === "minutes" ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number" min="0" placeholder="Ej. 120"
                                                    value={m1Minutes}
                                                    onChange={(e) => setM1Minutes(e.target.value ? Number(e.target.value) : "")}
                                                />
                                                <span className="text-sm text-muted-foreground">min</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Inicio</Label>
                                                    <Input type="time" value={m1Start} onChange={(e) => setM1Start(e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Fin</Label>
                                                    <Input type="time" value={m1End} onChange={(e) => setM1End(e.target.value)} />
                                                </div>
                                                {m1AvailMinutes > 0 && (
                                                    <p className="col-span-2 text-xs text-muted-foreground">
                                                        = {formatMinutes(m1AvailMinutes)} disponibles
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="m1-examiners">Número de aplicadores</Label>
                                        <Input
                                            id="m1-examiners" type="number" min="1" placeholder="1"
                                            value={m1Examiners}
                                            onChange={(e) => setM1Examiners(e.target.value ? Number(e.target.value) : "")}
                                        />
                                    </div>
                                </div>
                                <ResultBox>
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Capacidad Máxima</h4>
                                    {m1Result ? (
                                        <>
                                            <div className="text-6xl font-black text-primary leading-none">
                                                {m1Result.totalStudents}
                                            </div>
                                            <div className="text-xl font-semibold text-foreground mt-1">alumnos</div>
                                            <p className="text-sm text-muted-foreground mt-3">
                                                {m1Result.sessionsPerExaminer} sesiones por aplicador
                                            </p>
                                        </>
                                    ) : (
                                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                                            <Calculator className="w-10 h-10 opacity-20" />
                                            <p className="text-sm">Ingrese tiempo y aplicadores</p>
                                        </div>
                                    )}
                                </ResultBox>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MODE 2: TIME */}
                <TabsContent value="mode2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Calcular Tiempo</CardTitle>
                            <CardDescription>
                                ¿Cuánto tiempo necesito para evaluar a un grupo de alumnos?
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="m2-students">Total de alumnos</Label>
                                            <Input
                                                id="m2-students" type="number" min="1" placeholder="Ej. 30"
                                                value={m2Students}
                                                onChange={(e) => setM2Students(e.target.value ? Number(e.target.value) : "")}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="m2-examiners">Aplicadores</Label>
                                            <Input
                                                id="m2-examiners" type="number" min="1" placeholder="1"
                                                value={m2Examiners}
                                                onChange={(e) => setM2Examiners(e.target.value ? Number(e.target.value) : "")}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="m2-start">Hora de inicio (opcional)</Label>
                                        <Input
                                            id="m2-start" type="time"
                                            value={m2StartTime}
                                            onChange={(e) => setM2StartTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <ResultBox>
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Tiempo Estimado</h4>
                                    {m2Result ? (
                                        <>
                                            <div className="text-5xl font-black text-primary leading-none">
                                                {formatMinutes(m2Result.totalMinutes)}
                                            </div>
                                            {m2Result.endTime && (
                                                <div className="mt-4 text-base font-medium text-foreground bg-primary/10 px-4 py-2 rounded-lg w-full">
                                                    Término: <span className="font-bold">{m2Result.endTime}</span>
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-3">
                                                {m2Result.totalSessions} sesiones · {m2Result.sessionsPerExaminer} max por aplicador
                                            </p>
                                        </>
                                    ) : (
                                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                                            <Calculator className="w-10 h-10 opacity-20" />
                                            <p className="text-sm">Ingrese alumnos y aplicadores</p>
                                        </div>
                                    )}
                                </ResultBox>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MODE 3: EXAMINERS */}
                <TabsContent value="mode3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Calcular Aplicadores</CardTitle>
                            <CardDescription>
                                ¿Cuántos aplicadores necesito para evaluar a un grupo en un tiempo límite?
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="m3-students">Total de alumnos</Label>
                                        <Input
                                            id="m3-students" type="number" min="1" placeholder="Ej. 50"
                                            value={m3Students}
                                            onChange={(e) => setM3Students(e.target.value ? Number(e.target.value) : "")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tiempo disponible</Label>
                                        <ToggleInput value={m3Mode} onChange={(v) => { setM3Mode(v); setM3Minutes(""); setM3Start(""); setM3End(""); }} />
                                        {m3Mode === "minutes" ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number" min="0" placeholder="Ej. 180"
                                                    value={m3Minutes}
                                                    onChange={(e) => setM3Minutes(e.target.value ? Number(e.target.value) : "")}
                                                />
                                                <span className="text-sm text-muted-foreground">min</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Inicio</Label>
                                                    <Input type="time" value={m3Start} onChange={(e) => setM3Start(e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Fin</Label>
                                                    <Input type="time" value={m3End} onChange={(e) => setM3End(e.target.value)} />
                                                </div>
                                                {m3AvailMinutes > 0 && (
                                                    <p className="col-span-2 text-xs text-muted-foreground">
                                                        = {formatMinutes(m3AvailMinutes)} disponibles
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <ResultBox>
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Aplicadores Mínimos</h4>
                                    {m3Result ? (
                                        "error" in m3Result ? (
                                            <div className="text-destructive font-medium p-4 bg-destructive/10 rounded-lg text-sm">
                                                {m3Result.error}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-6xl font-black text-primary leading-none">
                                                    {m3Result.examinersNeeded}
                                                </div>
                                                <div className="text-xl font-semibold text-foreground mt-1">aplicadores</div>
                                                <p className="text-sm text-muted-foreground mt-3">
                                                    {m3Result.totalSessionsRequired} sesiones · max {m3Result.maxSessionsPerExaminer} por aplicador
                                                </p>
                                            </>
                                        )
                                    ) : (
                                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                                            <Calculator className="w-10 h-10 opacity-20" />
                                            <p className="text-sm">Ingrese alumnos y tiempo</p>
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
