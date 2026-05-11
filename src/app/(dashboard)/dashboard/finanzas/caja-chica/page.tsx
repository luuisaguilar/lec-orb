"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { format, parseISO, isValid } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Plus,
    Search,
    MoreHorizontal,
    Download,
    AlertCircle,
    Loader2,
    Wallet,
} from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { exportToXLSX } from "@/lib/finance/export-xlsx";
import { parseLegacyExcel } from "@/lib/finance/import-xlsx";
import { createClient } from "@/lib/supabase/client";
import { isFinanceAdminRole } from "@/lib/finance/finance-access";

const supabase = createClient();
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function normalizeExcelDate(value: unknown): string {
    if (value == null) return format(new Date(), "yyyy-MM-dd");
    if (typeof value === "number") {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(epoch.getTime() + value * 86400000);
        return isValid(d) ? format(d, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    }
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = parseISO(s);
    return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
}

function categoryLabelFromMovement(m: Record<string, unknown>): string {
    const bl = m.budget_lines as
        | {
              budget_items?: {
                  name?: string;
                  budget_categories?: { name?: string };
              };
          }
        | null
        | undefined;
    return bl?.budget_items?.budget_categories?.name || bl?.budget_items?.name || "—";
}

const movementFormSchema = z
    .object({
        fund_id: z.string().uuid("Seleccione un fondo"),
        movement_date: z.string().min(1, "Fecha requerida"),
        kind: z.enum(["income", "expense"]),
        concept: z.string().min(3, "Mínimo 3 caracteres"),
    amount: z
        .string()
        .min(1, "Monto requerido")
        .refine((s) => !Number.isNaN(parseFloat(s)) && parseFloat(s) > 0, "Monto debe ser mayor a 0"),
        budget_line_id: z.string().optional().nullable(),
        receipt_url: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
        if (data.kind === "expense" && !data.budget_line_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Seleccione una partida presupuestal",
                path: ["budget_line_id"],
            });
        }
    });

type MovementFormValues = z.infer<typeof movementFormSchema>;

export default function CajaChicaPage() {
    const { data: userData, error: userError, isLoading: userLoading } = useSWR("/api/v1/users/me", fetcher);
    const orgId = userData?.organization?.id as string | undefined;
    const memberRole = userData?.role as string | undefined;
    const canFinanceAdmin = isFinanceAdminRole(memberRole);

    const fiscalYear = new Date().getFullYear();

    const [movements, setMovements] = useState<any[]>([]);
    const [funds, setFunds] = useState<any[]>([]);
    const [fundId, setFundId] = useState<string>("");
    const [balance, setBalance] = useState<number>(0);
    const [budgetLines, setBudgetLines] = useState<any[]>([]);
    const [replenishments, setReplenishments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [mainTab, setMainTab] = useState<"movimientos" | "reposiciones">("movimientos");
    const [filters, setFilters] = useState({
        search: "",
    });

    const loadFunds = useCallback(async () => {
        if (!orgId) return;
        const res = await fetch(
            `/api/v1/finance/petty-cash/funds?org_id=${orgId}&status=open&fiscal_year=${fiscalYear}`
        );
        if (!res.ok) return;
        const { funds: list } = await res.json();
        setFunds(list ?? []);
        if (list?.length && !fundId) {
            setFundId(list[0].id);
        }
    }, [orgId, fiscalYear, fundId]);

    const loadBudgetLines = useCallback(
        async (movementDate: string) => {
            if (!orgId) return;
            const d = parseISO(movementDate);
            const y = isValid(d) ? d.getFullYear() : fiscalYear;
            const m = isValid(d) ? d.getMonth() + 1 : new Date().getMonth() + 1;
            const res = await fetch(
                `/api/v1/finance/budget-lines?org_id=${orgId}&fiscal_year=${y}&month=${m}&channel=non_fiscal`
            );
            if (!res.ok) return;
            const { lines } = await res.json();
            setBudgetLines(lines ?? []);
        },
        [orgId, fiscalYear]
    );

    const loadData = useCallback(async () => {
        if (!orgId || !fundId) return;
        try {
            setIsLoading(true);
            const q = new URLSearchParams({
                org_id: orgId,
                fund_id: fundId,
                limit: "100",
            });
            if (filters.search) q.set("search", filters.search);

            const [movRes, balRes] = await Promise.all([
                fetch(`/api/v1/finance/petty-cash?${q}`),
                fetch(`/api/v1/finance/petty-cash/balance?org_id=${orgId}&fund_id=${fundId}`),
            ]);

            if (movRes.ok) {
                const { movements: rows } = await movRes.json();
                setMovements(rows ?? []);
            }
            if (balRes.ok) {
                const { balance: b } = await balRes.json();
                setBalance(typeof b === "number" ? b : Number(b) || 0);
            }
        } catch (err) {
            console.error(err);
            toast.error("Error al cargar movimientos");
        } finally {
            setIsLoading(false);
        }
    }, [filters.search, fundId, orgId]);

    const loadReplenishments = useCallback(async () => {
        if (!orgId || !fundId) return;
        const res = await fetch(
            `/api/v1/finance/petty-cash/replenishments?org_id=${orgId}&fund_id=${fundId}`
        );
        if (!res.ok) return;
        const { replenishments: rows } = await res.json();
        setReplenishments(rows ?? []);
    }, [fundId, orgId]);

    useEffect(() => {
        if (orgId) loadFunds();
    }, [orgId, loadFunds]);

    useEffect(() => {
        if (orgId && fundId) {
            loadData();
            loadReplenishments();
        }
    }, [loadData, loadReplenishments, orgId, fundId]);

    const form = useForm<MovementFormValues>({
        resolver: zodResolver(movementFormSchema),
        defaultValues: {
            kind: "expense",
            movement_date: format(new Date(), "yyyy-MM-dd"),
            fund_id: "",
            concept: "",
            amount: "",
            budget_line_id: "",
            receipt_url: "",
        },
    });

    useEffect(() => {
        if (fundId) {
            form.setValue("fund_id", fundId);
        }
    }, [fundId, form]);

    const watchedDate = form.watch("movement_date");
    useEffect(() => {
        if (watchedDate) loadBudgetLines(watchedDate);
    }, [watchedDate, loadBudgetLines]);

    const totals = useMemo(() => {
        let ins = 0;
        let outs = 0;
        for (const m of movements) {
            if (m.status === "cancelled") continue;
            ins += Number(m.amount_in || 0);
            outs += Number(m.amount_out || 0);
        }
        return { ins, outs };
    }, [movements]);

    const onSubmit: SubmitHandler<MovementFormValues> = async (values) => {
        if (!orgId) return;
        try {
            const body = {
                org_id: orgId,
                fund_id: values.fund_id,
                movement_date: values.movement_date,
                concept: values.concept,
                amount_in: values.kind === "income" ? parseFloat(values.amount) : 0,
                amount_out: values.kind === "expense" ? parseFloat(values.amount) : 0,
                budget_line_id: values.kind === "expense" ? values.budget_line_id : null,
                receipt_url: values.receipt_url || null,
            };
            const res = await fetch("/api/v1/finance/petty-cash", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                toast.success("Movimiento registrado");
                setIsDialogOpen(false);
                form.reset({
                    kind: "expense",
                    movement_date: format(new Date(), "yyyy-MM-dd"),
                    fund_id: fundId,
                    concept: "",
                    amount: "",
                    budget_line_id: "",
                    receipt_url: "",
                });
                loadData();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Error al guardar");
            }
        } catch {
            toast.error("Error de red");
        }
    };

    const cancelMovement = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/finance/petty-cash/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Movimiento cancelado");
                loadData();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "No se pudo cancelar");
            }
        } catch {
            toast.error("Error de red");
        }
    };

    const handleReplenishmentAction = async (id: string, action: "approve" | "reject") => {
        try {
            const res = await fetch(`/api/v1/finance/petty-cash/replenishments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                toast.success(action === "approve" ? "Reposición aprobada" : "Reposición rechazada");
                loadReplenishments();
                loadData();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Error");
            }
        } catch {
            toast.error("Error de red");
        }
    };

    const [repDialogOpen, setRepDialogOpen] = useState(false);
    const [repAmount, setRepAmount] = useState("");
    const [repJust, setRepJust] = useState("");

    const submitReplenishment = async () => {
        if (!fundId || !orgId) return;
        const amt = parseFloat(repAmount);
        if (!(amt > 0) || !repJust.trim()) {
            toast.error("Monto y justificación son obligatorios");
            return;
        }
        const res = await fetch("/api/v1/finance/petty-cash/replenishments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fund_id: fundId,
                requested_amount: amt,
                justification: repJust.trim(),
            }),
        });
        if (res.ok) {
            toast.success("Solicitud enviada");
            setRepDialogOpen(false);
            setRepAmount("");
            setRepJust("");
            loadReplenishments();
        } else {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Error");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Caja Chica</h2>
                    <p className="text-muted-foreground">Fondos, partidas presupuestales y reposiciones (V2).</p>
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

                <div className="flex flex-wrap items-center gap-2">
                    {canFinanceAdmin && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/finanzas/caja-chica/fondos">
                                <Wallet className="mr-2 h-4 w-4" />
                                Fondos
                            </Link>
                        </Button>
                    )}
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
                            if (!file || !orgId || !fundId) return;
                            try {
                                const orgs = { LEC: orgId, DISCOVER: orgId, URUS: orgId };
                                const catRes = await fetch("/api/v1/finance/petty-cash/categories");
                                const { categories } = catRes.ok ? await catRes.json() : { categories: [] };
                                const cats = Object.fromEntries(
                                    (categories as { name: string; id: string }[]).map((c) => [c.name, c.id])
                                );
                                const rows = await parseLegacyExcel(file, orgs, cats);
                                for (const m of rows) {
                                    const md = normalizeExcelDate(m.date);
                                    const d = parseISO(md);
                                    const y = isValid(d) ? d.getFullYear() : fiscalYear;
                                    const mon = isValid(d) ? d.getMonth() + 1 : 1;
                                    const lr = await fetch(
                                        `/api/v1/finance/budget-lines?org_id=${orgId}&fiscal_year=${y}&month=${mon}&channel=non_fiscal`
                                    );
                                    const { lines } = lr.ok ? await lr.json() : { lines: [] };
                                    const want =
                                        (m.categoryName as string) ||
                                        (categories as { name: string }[]).find(
                                            (c) => cats[c.name] === m.category_id
                                        )?.name;
                                    const line = (lines as any[]).find(
                                        (l) => l.budget_items?.budget_categories?.name === want
                                    );
                                    if (m.type === "EXPENSE" && !line?.id) {
                                        toast.warning(`Sin partida para categoría «${want}» — fila omitida`);
                                        continue;
                                    }
                                    const res = await fetch("/api/v1/finance/petty-cash", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            org_id: orgId,
                                            fund_id: fundId,
                                            movement_date: md,
                                            concept: m.concept,
                                            amount_in: m.type === "INCOME" ? m.amount : 0,
                                            amount_out: m.type === "EXPENSE" ? m.amount : 0,
                                            budget_line_id: m.type === "EXPENSE" ? line.id : null,
                                        }),
                                    });
                                    if (!res.ok) {
                                        const err = await res.json().catch(() => ({}));
                                        toast.error(err.error || "Error en fila importada");
                                        break;
                                    }
                                }
                                toast.success("Importación completada");
                                loadData();
                            } catch (err) {
                                console.error(err);
                                toast.error("Error al importar Excel");
                            }
                        }}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToXLSX(movements, `caja-chica-${format(new Date(), "yyyy-MM-dd")}`)}
                    >
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
                        <DialogContent className="sm:max-w-[520px]">
                            <DialogHeader>
                                <DialogTitle>Registrar movimiento</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fondo</label>
                                        <Select
                                            onValueChange={(v) => {
                                                setFundId(v);
                                                form.setValue("fund_id", v);
                                            }}
                                            value={form.watch("fund_id")}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Fondo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {funds.map((f) => (
                                                    <SelectItem key={f.id} value={f.id}>
                                                        {f.name} ({f.fiscal_year})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fecha</label>
                                        <Input type="date" {...form.register("movement_date")} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tipo</label>
                                    <div className="flex bg-muted p-1 rounded-md">
                                        <button
                                            type="button"
                                            onClick={() => form.setValue("kind", "expense")}
                                            className={cn(
                                                "flex-1 py-1.5 text-sm font-medium rounded transition-all",
                                                form.watch("kind") === "expense"
                                                    ? "bg-background shadow-sm"
                                                    : "hover:bg-background/50"
                                            )}
                                        >
                                            Egreso
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => form.setValue("kind", "income")}
                                            className={cn(
                                                "flex-1 py-1.5 text-sm font-medium rounded transition-all",
                                                form.watch("kind") === "income"
                                                    ? "bg-background shadow-sm text-emerald-600"
                                                    : "hover:bg-background/50"
                                            )}
                                        >
                                            Ingreso
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Concepto</label>
                                    <Input placeholder="Ej. Papelería" {...form.register("concept")} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {form.watch("kind") === "expense" && (
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-sm font-medium">Partida presupuestal</label>
                                            <Select
                                                onValueChange={(v) => form.setValue("budget_line_id", v)}
                                                value={form.watch("budget_line_id") || ""}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione partida (mes de la fecha)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {budgetLines.map((line) => (
                                                        <SelectItem key={line.id} value={line.id}>
                                                            {line.budget_items?.budget_categories?.name} —{" "}
                                                            {line.budget_items?.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {form.formState.errors.budget_line_id && (
                                                <p className="text-xs text-destructive">
                                                    {form.formState.errors.budget_line_id.message}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Monto</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="pl-6"
                                                {...form.register("amount")}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Comprobante (opcional)</label>
                                    <Input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const path = `receipts/${Date.now()}-${file.name}`;
                                                const { data } = await supabase.storage
                                                    .from("petty-cash-receipts")
                                                    .upload(path, file);
                                                if (data) {
                                                    const {
                                                        data: { publicUrl },
                                                    } = supabase.storage.from("petty-cash-receipts").getPublicUrl(path);
                                                    form.setValue("receipt_url", publicUrl);
                                                }
                                            }
                                        }}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit">Guardar</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2 max-w-xs">
                    <label className="text-sm font-medium">Fondo activo</label>
                    <Select value={fundId} onValueChange={setFundId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione fondo" />
                        </SelectTrigger>
                        <SelectContent>
                            {funds.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                    {f.name} — ${Number(f.current_balance).toLocaleString()} MXN
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
                <TabsList>
                    <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
                    <TabsTrigger value="reposiciones">Reposiciones</TabsTrigger>
                </TabsList>

                <TabsContent value="movimientos" className="space-y-6 mt-4">
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Saldo del fondo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">${balance.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1">Balance actual (V2)</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Entradas (página)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">
                                    ${totals.ins.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Salidas (página)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-rose-600">
                                    ${totals.outs.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Historial</CardTitle>
                            <div className="flex flex-col md:flex-row gap-4 mt-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por concepto..."
                                        className="pl-9"
                                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") loadData();
                                        }}
                                    />
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => loadData()}>
                                    Buscar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Fecha</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead>Partida</TableHead>
                                        <TableHead className="text-right">Ingreso</TableHead>
                                        <TableHead className="text-right">Egreso</TableHead>
                                        <TableHead className="text-right">Saldo tras</TableHead>
                                        <TableHead className="w-[50px]" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8">
                                                Cargando...
                                            </TableCell>
                                        </TableRow>
                                    ) : movements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No hay movimientos.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        movements.map((m) => (
                                            <TableRow key={m.id} className={m.status === "cancelled" ? "opacity-50" : ""}>
                                                <TableCell className="font-medium">
                                                    {format(parseISO(m.movement_date), "dd/MM/yy")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{m.concept}</div>
                                                    {m.status === "cancelled" && (
                                                        <Badge variant="outline" className="mt-1 text-xs">
                                                            Cancelado
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{categoryLabelFromMovement(m)}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-emerald-600 font-medium">
                                                    {Number(m.amount_in) > 0
                                                        ? `$${Number(m.amount_in).toLocaleString()}`
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right text-rose-600 font-medium">
                                                    {Number(m.amount_out) > 0
                                                        ? `$${Number(m.amount_out).toLocaleString()}`
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground text-sm">
                                                    ${Number(m.balance_after).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {m.status === "posted" && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                <DropdownMenuItem
                                                                    className="text-rose-600"
                                                                    onClick={() => cancelMovement(m.id)}
                                                                >
                                                                    Cancelar movimiento
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reposiciones" className="space-y-4 mt-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            Solicitudes de reposición del fondo seleccionado.
                        </p>
                        <Dialog open={repDialogOpen} onOpenChange={setRepDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">Solicitar reposición</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nueva solicitud</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="text-sm font-medium">Monto solicitado</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={repAmount}
                                            onChange={(e) => setRepAmount(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Justificación</label>
                                        <Input value={repJust} onChange={(e) => setRepJust(e.target.value)} />
                                    </div>
                                    <Button onClick={submitReplenishment}>Enviar</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Monto</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Justificación</TableHead>
                                        {canFinanceAdmin && <TableHead className="text-right">Acciones</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {replenishments.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={canFinanceAdmin ? 5 : 4}
                                                className="text-center py-8 text-muted-foreground"
                                            >
                                                Sin solicitudes.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        replenishments.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell>{r.request_date}</TableCell>
                                                <TableCell>${Number(r.requested_amount).toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{r.status}</Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[240px] truncate">
                                                    {r.justification}
                                                </TableCell>
                                                {canFinanceAdmin && (
                                                    <TableCell className="text-right space-x-2">
                                                        {r.status === "pending" && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => handleReplenishmentAction(r.id, "approve")}
                                                                >
                                                                    Aprobar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleReplenishmentAction(r.id, "reject")}
                                                                >
                                                                    Rechazar
                                                                </Button>
                                                            </>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
