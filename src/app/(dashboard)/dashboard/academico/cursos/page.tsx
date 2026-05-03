"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
    Calculator, 
    TrendingUp, 
    Users, 
    DollarSign, 
    Target, 
    AlertCircle,
    Info,
    ArrowRight,
    Save,
    History,
    Plus,
    CheckCircle2,
    FileText,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CoursesPage() {
    // List of simulations
    const [savedSims, setSavedSims] = useState<any[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeSimId, setActiveSimId] = useState<string | null>(null);

    // Simulator State
    const [sim, setSim] = useState({
        name: "Nueva Proyección Mayo",
        price_per_student: 2500,
        target_students: 12,
        fixed_instructor: 8000,
        fixed_marketing: 2000,
        fixed_other: 1500,
        var_materials: 350,
        var_fees: 0
    });

    // Fetch simulations on mount
    useEffect(() => {
        fetchSimulations();
    }, []);

    const fetchSimulations = async () => {
        setIsLoadingList(true);
        try {
            const res = await fetch('/api/v1/courses');
            const data = await res.json();
            if (Array.isArray(data)) setSavedSims(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingList(false);
        }
    };

    const loadSimulation = (item: any) => {
        setActiveSimId(item.id);
        setSim({
            name: item.name,
            price_per_student: Number(item.price_per_student),
            target_students: item.target_students,
            fixed_instructor: Number(item.fixed_cost_instructor),
            fixed_marketing: Number(item.fixed_cost_marketing),
            fixed_other: Number(item.fixed_cost_other),
            var_materials: Number(item.var_cost_materials),
            var_fees: Number(item.var_cost_fees)
        });
        toast.info(`Cargada: ${item.name}`);
    };

    const handleSave = async (status: string = 'draft') => {
        setIsSaving(true);
        const payload = {
            id: activeSimId,
            name: sim.name,
            price_per_student: sim.price_per_student,
            target_students: sim.target_students,
            fixed_cost_instructor: sim.fixed_instructor,
            fixed_cost_marketing: sim.fixed_marketing,
            fixed_cost_other: sim.fixed_other,
            var_cost_materials: sim.var_materials,
            var_cost_fees: sim.var_fees,
            status: status
        };

        try {
            const method = activeSimId ? 'PUT' : 'POST';
            const res = await fetch('/api/v1/courses', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.id) {
                setActiveSimId(data.id);
                fetchSimulations();
                toast.success(status === 'published' ? "¡Curso aprobado y enviado al catálogo!" : "Simulación guardada correctamente");
            }
        } catch (error) {
            toast.error("Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    // Calculations
    const financials = useMemo(() => {
        const totalFixed = sim.fixed_instructor + sim.fixed_marketing + sim.fixed_other;
        const varPerStudent = sim.var_materials + sim.var_fees;
        const contributionMargin = sim.price_per_student - varPerStudent;
        
        const breakEvenStudents = Math.ceil(totalFixed / (contributionMargin || 1));
        const revenue = sim.price_per_student * sim.target_students;
        const totalVar = varPerStudent * sim.target_students;
        const profit = revenue - totalFixed - totalVar;
        const marginPct = (profit / (revenue || 1)) * 100;
        
        const currentCAC = sim.fixed_marketing / (sim.target_students || 1);

        return {
            totalFixed,
            varPerStudent,
            breakEvenStudents,
            profit,
            marginPct,
            currentCAC,
            revenue
        };
    }, [sim]);

    const getMarginColor = (pct: number) => {
        if (pct < 10) return "text-red-500 bg-red-500/10";
        if (pct < 25) return "text-yellow-500 bg-yellow-500/10";
        return "text-emerald-500 bg-emerald-500/10";
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar: Saved Projections */}
            <div className="w-80 border-r bg-muted/30 p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        Proyecciones Guardadas
                    </h2>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => {
                            setActiveSimId(null);
                            setSim(s => ({...s, name: "Nueva Simulación"}));
                        }}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                <div className="space-y-2">
                    {isLoadingList ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                    ) : savedSims.length === 0 ? (
                        <p className="text-xs text-center text-muted-foreground py-8">No hay simulaciones guardadas.</p>
                    ) : savedSims.map(item => (
                        <button
                            key={item.id}
                            onClick={() => loadSimulation(item)}
                            className={`w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50 group ${activeSimId === item.id ? 'bg-background border-primary shadow-sm' : 'bg-background/50 border-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold truncate max-w-[140px]">{item.name}</span>
                                <Badge variant={item.status === 'published' ? 'default' : 'outline'} className="text-[10px] h-4">
                                    {item.status === 'published' ? 'Aprobado' : 'Borrador'}
                                </Badge>
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>${Number(item.price_per_student).toLocaleString()} / alumno</span>
                                <span className={item.status === 'published' ? 'text-primary font-bold' : ''}>
                                    {item.target_students} est.
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content: Simulator */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-background">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Simulador de Rentabilidad</h1>
                        <p className="text-muted-foreground">Analiza la viabilidad financiera de tus cursos antes de lanzarlos.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => handleSave('draft')}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Guardar Borrador
                        </Button>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleSave('published')}
                            disabled={isSaving}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Aprobar y Publicar
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Controls */}
                    <Card className="lg:col-span-1 border-primary/20 shadow-xl shadow-primary/5">
                        <CardHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nombre de la Simulación</Label>
                                    <Input 
                                        className="text-lg font-bold border-none bg-muted/50 focus-visible:ring-primary"
                                        value={sim.name}
                                        onChange={(e) => setSim(s => ({...s, name: e.target.value}))}
                                        placeholder="Ej: Curso de Inglés Intensivo"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Precio por Alumno</Label>
                                        <span className="font-mono text-sm">${sim.price_per_student.toLocaleString()}</span>
                                    </div>
                                    <Slider 
                                        value={[sim.price_per_student]} 
                                        max={8000} 
                                        step={100} 
                                        onValueChange={([v]) => setSim(s => ({...s, price_per_student: v}))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Meta de Alumnos</Label>
                                        <span className="font-mono text-sm">{sim.target_students}</span>
                                    </div>
                                    <Slider 
                                        value={[sim.target_students]} 
                                        max={30} 
                                        step={1} 
                                        onValueChange={([v]) => setSim(s => ({...s, target_students: v}))}
                                    />
                                </div>

                                <div className="pt-4 border-t space-y-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1">
                                            Honorarios Instructor
                                            <Info className="w-3 h-3 text-muted-foreground" />
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={sim.fixed_instructor} 
                                            onChange={(e) => setSim(s => ({...s, fixed_instructor: Number(e.target.value)}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Marketing Digital</Label>
                                        <Input 
                                            type="number" 
                                            value={sim.fixed_marketing} 
                                            onChange={(e) => setSim(s => ({...s, fixed_marketing: Number(e.target.value)}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Materiales p/ Alumno</Label>
                                        <Input 
                                            type="number" 
                                            value={sim.var_materials} 
                                            onChange={(e) => setSim(s => ({...s, var_materials: Number(e.target.value)}))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="relative overflow-hidden group bg-gradient-to-br from-background to-primary/5">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Utilidad Proyectada</p>
                                            <h3 className="text-4xl font-black mt-1 tracking-tight text-primary">
                                                ${financials.profit.toLocaleString()}
                                            </h3>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${getMarginColor(financials.marginPct)}`}>
                                            {financials.marginPct.toFixed(1)}% ROI
                                        </div>
                                    </div>
                                    <div className="mt-6 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-1000" 
                                            style={{ width: `${Math.min(Math.max(financials.marginPct, 0), 100)}%` }} 
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className={sim.target_students >= financials.breakEvenStudents ? "border-emerald-500/20" : "border-red-500/20"}>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Punto de Equilibrio</p>
                                            <h3 className="text-3xl font-bold mt-1">{financials.breakEvenStudents} Inscritos</h3>
                                        </div>
                                        <Badge variant={sim.target_students >= financials.breakEvenStudents ? "default" : "destructive"}>
                                            {sim.target_students >= financials.breakEvenStudents ? "Factible" : "Crítico"}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1 bg-muted/50 p-2 rounded">
                                        <AlertCircle className="w-3 h-3 text-orange-500" />
                                        Requiere el {(financials.breakEvenStudents / sim.target_students * 100).toFixed(0)}% del cupo para cubrir costos.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-card shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    Métricas de Eficiencia
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">CAC Proyectado</Label>
                                    <p className="text-xl font-bold">${financials.currentCAC.toFixed(0)}</p>
                                    <p className="text-[10px] text-muted-foreground italic">Adquisición por alumno</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Costos Fijos</Label>
                                    <p className="text-xl font-bold">${financials.totalFixed.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground italic">Base operativa total</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-emerald-600">Margen Seguridad</Label>
                                    <p className="text-xl font-bold text-emerald-600">
                                        {Math.max(sim.target_students - financials.breakEvenStudents, 0)} Alumnos
                                    </p>
                                    <p className="text-[10px] text-muted-foreground italic">Margen de error estimado</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-muted/20 rounded-xl border p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <FileText className="w-3 h-3" />
                                        Análisis de Escenarios
                                    </h4>
                                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                </div>
                                <div className="space-y-2">
                                    {[0.5, 0.75, 1, 1.25].map((factor) => {
                                        const students = Math.round(sim.target_students * factor);
                                        const rev = students * sim.price_per_student;
                                        const cost = financials.totalFixed + (financials.varPerStudent * students);
                                        const prof = rev - cost;
                                        return (
                                            <div key={factor} className="flex items-center justify-between text-sm p-3 rounded-lg hover:bg-background transition-all border border-transparent hover:border-border group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 text-center text-[10px] font-black rounded px-1 ${factor === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                        {(factor * 100).toFixed(0)}%
                                                    </div>
                                                    <div className="text-xs font-medium">{students} Inscritos</div>
                                                </div>
                                                <div className={`font-mono font-bold ${prof >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                    ${prof.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
