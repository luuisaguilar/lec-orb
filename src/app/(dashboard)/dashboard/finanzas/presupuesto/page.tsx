"use client";

import { useEffect, useState, useCallback } from "react";
import { 
    PieChart, 
    Save, 
    ChevronLeft, 
    ChevronRight, 
    TrendingUp, 
    TrendingDown,
    AlertCircle,
    Info
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import useSWR from "swr";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PresupuestoPage() {
    const { data: userData, error: userError, isLoading: userLoading } = useSWR("/api/v1/users/me", fetcher);
    const orgId = userData?.organization?.id || userData?.member?.org_id;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [categories, setCategories] = useState<any[]>([]);
    const [budgets, setBudgets] = useState<any[]>([]);
    const [comparative, setComparative] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editedBudgets, setEditedBudgets] = useState<Record<string, number>>({});

    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Load Data
    const loadData = useCallback(async () => {
        if (!orgId) return;
        try {
            setIsLoading(true);
            const [catRes, budRes, compRes] = await Promise.all([
                fetch("/api/v1/finance/petty-cash/categories"),
                fetch(`/api/v1/finance/budget?org_id=${orgId}&month=${month}&year=${year}`), // Explicit org scoping
                fetch(`/api/v1/finance/budget/comparative?month=${month}&year=${year}`)
            ]);

            if (catRes.ok) {
                const { categories } = await catRes.json();
                setCategories(categories);
            }

            if (budRes.ok) {
                const { budgets } = await budRes.json();
                setBudgets(budgets || []);
                // Initialize edited values
                const initial: Record<string, number> = {};
                budgets.forEach((b: any) => {
                    initial[b.category_id] = b.amount;
                });
                setEditedBudgets(initial);
            }

            if (compRes.ok) {
                const { comparative } = await compRes.json();
                setComparative(comparative || []);
            }
        } catch (err) {
            console.error("Error loading budget data", err);
            toast.error("Error al cargar datos del presupuesto");
        } finally {
            setIsLoading(false);
        }
    }, [month, year, orgId]);

    useEffect(() => {
        if (orgId) {
            loadData();
        }
    }, [loadData, orgId]);

    const handleSave = async () => {
        if (!orgId) {
            toast.error("Contexto de organización no disponible");
            return;
        }

        try {
            setIsSaving(true);
            const entries = Object.entries(editedBudgets).map(([category_id, amount]) => ({
                org_id: orgId,
                category_id,
                month,
                year,
                amount
            }));

            const res = await fetch("/api/v1/finance/budget", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entries),
            });

            if (res.ok) {
                toast.success("Presupuesto guardado correctamente");
                loadData();
            } else {
                const error = await res.json();
                toast.error(error.error || "Error al guardar");
            }
        } catch (err) {
            console.error("Error saving budget", err);
            toast.error("Error al guardar presupuesto");
        } finally {
            setIsSaving(false);
        }
    };

    if (userError) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error de Conexión</AlertTitle>
                    <AlertDescription>
                        No se pudo cargar el contexto de la organización. Por favor, intente de nuevo más tarde.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Presupuesto</h2>
                    <p className="text-muted-foreground">
                        Planificación y control de gastos mensuales.
                    </p>
                </div>
                
                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="px-4 font-bold capitalize min-w-[140px] text-center">
                        {format(currentDate, "MMMM yyyy", { locale: es })}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="grid" className="space-y-6">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="grid" className="px-6">Configuración</TabsTrigger>
                    <TabsTrigger value="comparative" className="px-6">Comparativa Real</TabsTrigger>
                </TabsList>

                {/* --- CONFIGURATION GRID --- */}
                <TabsContent value="grid" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Asignación de Presupuesto</CardTitle>
                                <CardDescription>Define el monto máximo por categoría para este mes.</CardDescription>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving}>
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="w-[300px]">Monto Presupuestado (MXN)</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((cat) => (
                                        <TableRow key={cat.id}>
                                            <TableCell className="font-medium">{cat.name}</TableCell>
                                            <TableCell>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                                                    <Input 
                                                        type="number" 
                                                        className="pl-6" 
                                                        value={editedBudgets[cat.id] || 0}
                                                        onChange={(e) => setEditedBudgets(prev => ({ ...prev, [cat.id]: Number(e.target.value) }))}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(editedBudgets[cat.id] || 0) > 0 ? (
                                                    <Badge className="bg-emerald-50 content-emerald-700 border-emerald-200">Asignado</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="opacity-50">Sin asignar</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- COMPARATIVE VIEW --- */}
                <TabsContent value="comparative" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Cumplimiento Global</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">84%</div>
                                <div className="flex items-center text-xs text-emerald-600 mt-1">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Dentro del límite
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Análisis de Variación</CardTitle>
                            <CardDescription>Comparación entre lo planeado y lo gastado realmente.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="text-right">Presupuestado</TableHead>
                                        <TableHead className="text-right">Real</TableHead>
                                        <TableHead className="text-right">Variación</TableHead>
                                        <TableHead className="text-right">%</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {comparative.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No hay datos comparativos para este período.
                                            </TableCell>
                                        </TableRow>
                                    ) : comparative.map((row) => {
                                        const isExceeded = row.variation < 0;
                                        return (
                                            <TableRow key={row.category_id}>
                                                <TableCell className="font-medium">{row.category_name}</TableCell>
                                                <TableCell className="text-right font-mono">${row.budgeted.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-mono">${row.actual.toLocaleString()}</TableCell>
                                                <TableCell className={cn(
                                                    "text-right font-bold font-mono",
                                                    isExceeded ? "text-rose-600" : "text-emerald-600"
                                                )}>
                                                    {isExceeded ? "" : "+"}${row.variation.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className={cn(
                                                            "text-xs font-bold",
                                                            isExceeded ? "text-rose-600" : "text-emerald-600"
                                                        )}>
                                                            {row.variation_pct.toFixed(1)}%
                                                        </span>
                                                        {isExceeded ? (
                                                            <TrendingDown className="h-4 w-4 text-rose-600" />
                                                        ) : (
                                                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800">
                        <Info className="h-5 w-5 shrink-0" />
                        <p className="text-sm">
                            <strong>Tip:</strong> Los valores positivos en variación indican ahorros respecto al presupuesto, mientras que los negativos indican gastos excedidos.
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
