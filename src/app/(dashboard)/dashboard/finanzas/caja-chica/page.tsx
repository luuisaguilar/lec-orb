"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { 
    Wallet, 
    Plus, 
    Search, 
    Filter, 
    MoreHorizontal, 
    ArrowUpRight, 
    ArrowDownLeft,
    Download,
    Calendar as CalendarIcon,
    AlertCircle,
    Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useSWR from "swr";
import { toast } from "sonner";

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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { exportToXLSX } from "@/lib/finance/export-xlsx";
import { parseLegacyExcel } from "@/lib/finance/import-xlsx";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Types & Schemas ---

const movementSchema = z.object({
    org_id: z.string().uuid("Seleccione una empresa"),
    category_id: z.string().uuid("Seleccione una categoría"),
    date: z.string().min(1, "Fecha es requerida"),
    concept: z.string().min(3, "Mínimo 3 caracteres"),
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.coerce.number().positive("Monto debe ser mayor a 0"),
    partial_amount: z.coerce.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    receipt_url: z.string().optional().nullable(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

// --- Components ---

export default function CajaChicaPage() {
    const { data: userData, error: userError, isLoading: userLoading } = useSWR("/api/v1/users/me", fetcher);
    const orgId = userData?.organization?.id || userData?.member?.org_id;

    // State
    const [movements, setMovements] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        org_id: "",
        category_id: "",
        search: "",
        type: "",
    });

    // Load Foundation Data
    useEffect(() => {
        async function loadFoundation() {
            try {
                const catRes = await fetch("/api/v1/finance/petty-cash/categories");
                if (catRes.ok) {
                    const { categories } = await catRes.json();
                    setCategories(categories);
                }
            } catch (err) {
                console.error("Error loading categories", err);
            }
        }
        loadFoundation();
    }, []);

    // Load Movements & Balance
    const loadData = useCallback(async () => {
        if (!orgId) return;
        try {
            setIsLoading(true);
            const queryParams = new URLSearchParams({
                ...filters,
                org_id: orgId, // Force current org context
                limit: "50"
            }).toString();

            const [movRes, balRes] = await Promise.all([
                fetch(`/api/v1/finance/petty-cash?${queryParams}`),
                fetch(`/api/v1/finance/petty-cash/balance?org_id=${orgId}`)
            ]);

            if (movRes.ok) {
                const { movements } = await movRes.json();
                setMovements(movements || []);
            }

            if (balRes.ok) {
                const { balance } = await balRes.json();
                setBalance(balance || 0);
            }
        } catch (err) {
            console.error("Error loading data", err);
            toast.error("Error al cargar movimientos");
        } finally {
            setIsLoading(false);
        }
    }, [filters, orgId]);

    useEffect(() => {
        if (orgId) {
            loadData();
        }
    }, [loadData, orgId]);

    // Form
    const form = useForm({
        resolver: zodResolver(movementSchema),
        defaultValues: {
            type: "EXPENSE",
            date: format(new Date(), "yyyy-MM-dd"),
            org_id: orgId || "",
            category_id: "",
            concept: "",
            amount: 0,
            notes: "",
            receipt_url: "",
            partial_amount: null
        }
    });

    // Update form when orgId arrives
    useEffect(() => {
        if (orgId) {
            form.setValue("org_id", orgId);
        }
    }, [orgId, form]);

    const onSubmit: SubmitHandler<MovementFormValues> = async (values) => {
        if (!orgId) return;
        try {
            const res = await fetch("/api/v1/finance/petty-cash", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    org_id: orgId // Hardware enforcement of current org
                }),
            });
            if (res.ok) {
                toast.success("Movimiento registrado");
                setIsDialogOpen(false);
                form.reset({
                    ...form.getValues(),
                    amount: 0,
                    concept: "",
                    notes: ""
                });
                loadData();
            } else {
                const error = await res.json();
                toast.error(error.error || "Error al guardar");
            }
        } catch (err) {
            console.error("Error saving movement", err);
            toast.error("Error de red");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Caja Chica</h2>
                    <p className="text-muted-foreground">
                        Control de ingresos y egresos de caja menor.
                    </p>
                </div>

                {userLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verificando contexto...</span>
                    </div>
                )}

                {userError && (
                    <Alert variant="destructive" className="max-w-md">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error de Contexto</AlertTitle>
                        <AlertDescription>
                            No se pudo determinar la organización activa. Por favor, reintente.
                        </AlertDescription>
                    </Alert>
                )}
                
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => document.getElementById("import-excel")?.click()}
                    >
                        <Download className="mr-2 h-4 w-4 rotate-180" />
                        Importar
                    </Button>
                    <input 
                        id="import-excel" 
                        type="file" 
                        className="hidden" 
                        accept=".xlsx, .xls"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file && orgId) {
                                try {
                                    const orgs = { [userData?.organization?.name || "Empresa"]: orgId };
                                    const cats = Object.fromEntries(categories.map(c => [c.name, c.id]));
                                    const movements: any = await parseLegacyExcel(file, orgs, cats);
                                    
                                    for (const m of movements) {
                                        await fetch("/api/v1/finance/petty-cash", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ ...m, org_id: orgId })
                                        });
                                    }
                                    toast.success("Importación completada");
                                    loadData();
                                } catch (err) {
                                    console.error("Import failed", err);
                                    toast.error("Error al importar Excel");
                                }
                            }
                        }}
                    />
                    <Button variant="outline" size="sm" onClick={() => exportToXLSX(movements, `caja-chica-${format(new Date(), "yyyy-MM-dd")}`)}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Movimiento
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Registrar Movimiento</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Empresa</label>
                                        <Select 
                                            onValueChange={(v) => form.setValue("org_id", v)}
                                            value={form.watch("org_id")}
                                            disabled
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione empresa" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={orgId || "loading"}>
                                                    {userData?.organization?.name || "Cargando..."}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fecha</label>
                                        <Input type="date" {...form.register("date")} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tipo</label>
                                    <div className="flex bg-muted p-1 rounded-md">
                                        <button 
                                            type="button"
                                            onClick={() => form.setValue("type", "EXPENSE")}
                                            className={cn(
                                                "flex-1 py-1.5 text-sm font-medium rounded transition-all",
                                                form.watch("type") === "EXPENSE" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                            )}
                                        >
                                            Egreso
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => form.setValue("type", "INCOME")}
                                            className={cn(
                                                "flex-1 py-1.5 text-sm font-medium rounded transition-all",
                                                form.watch("type") === "INCOME" ? "bg-background shadow-sm text-emerald-600" : "hover:bg-background/50"
                                            )}
                                        >
                                            Ingreso
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Concepto</label>
                                    <Input placeholder="Ej. Papelería para oficina" {...form.register("concept")} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Categoría</label>
                                        <Select onValueChange={(v) => form.setValue("category_id", v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Monto</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                            <Input type="number" step="0.01" className="pl-6" {...form.register("amount")} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Comprobante (Opcional)</label>
                                    <Input 
                                        type="file" 
                                        accept="image/*,application/pdf"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const path = `receipts/${Date.now()}-${file.name}`;
                                                const { data, error } = await supabase.storage
                                                    .from("petty-cash-receipts")
                                                    .upload(path, file);
                                                if (data) {
                                                    const { data: { publicUrl } } = supabase.storage
                                                        .from("petty-cash-receipts")
                                                        .getPublicUrl(path);
                                                    form.setValue("receipt_url", publicUrl);
                                                }
                                            }
                                        }}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                    <Button type="submit">Guardar</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${balance.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Balance consolidado
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Entradas (Año)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">$0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Caja chica LEC
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Salidas (Año)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">$0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Gastos operativos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Table & Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
                    <div className="flex flex-col md:flex-row gap-4 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por concepto..." 
                                className="pl-9"
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                            />
                        </div>
                        <Select onValueChange={(v) => setFilters(f => ({ ...f, category_id: v === "all" ? "" : v }))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select onValueChange={(v) => setFilters(f => ({ ...f, type: v === "all" ? "" : v }))}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="INCOME">Entradas</SelectItem>
                                <SelectItem value="EXPENSE">Salidas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Fecha</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead className="text-right">Ingreso</TableHead>
                                <TableHead className="text-right">Egreso</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell>
                                </TableRow>
                            ) : movements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No se encontraron movimientos.</TableCell>
                                </TableRow>
                            ) : movements.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-medium">
                                        {format(new Date(m.date), "dd/MM/yy")}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{m.concept}</div>
                                            {m.notes && <div className="text-xs text-muted-foreground">{m.notes}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{m.petty_cash_categories?.name}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-emerald-600 font-medium">
                                        {m.type === "INCOME" ? `$${m.amount.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-rose-600 font-medium">
                                        {m.type === "EXPENSE" ? `$${m.amount.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem>Editar</DropdownMenuItem>
                                                <Separator />
                                                <DropdownMenuItem className="text-rose-600">Eliminar</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Visual Summary (Category Distribution) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Distribución por Categoría</CardTitle>
                    <CardDescription>Gastos acumulados este mes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {categories.slice(0, 5).map(cat => {
                        const totalCat = movements
                            .filter(m => m.category_id === cat.id && m.type === "EXPENSE")
                            .reduce((sum, m) => sum + Number(m.amount), 0);
                        const percentage = balance > 0 ? (totalCat / balance) * 100 : 0;
                        
                        return (
                            <div key={cat.id} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>{cat.name}</span>
                                    <span className="font-medium">${totalCat.toLocaleString()}</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all" 
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
