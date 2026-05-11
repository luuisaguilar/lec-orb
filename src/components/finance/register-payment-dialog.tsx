"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, CreditCard, Receipt } from "lucide-react";
import { toast } from "sonner";

const paymentSchema = z.object({
    mode: z.enum(["exam", "other"]),
    concept_id: z.string().optional().nullable().or(z.literal("")),
    custom_concept: z.string().optional().nullable().or(z.literal("")),
    amount: z.number().min(0, "El total no puede ser negativo"),
    base_amount: z.number().min(0),
    first_name: z.string().min(2, "Requerido"),
    last_name: z.string().min(2, "Requerido"),
    email: z.string().email("Correo inválido").or(z.literal("")).optional().nullable(),
    institution: z.string().optional().nullable().or(z.literal("")),
    quantity: z.number().int().min(1, "Mínimo 1"),
    discount: z.number().min(0, "Mínimo 0"),
    currency: z.enum(["MXN", "USD", "EUR"]),
    payment_method: z.string().min(1, "Selecciona método"),
    notes: z.string().optional().nullable().or(z.literal("")),
}).refine(data => {
    if (data.mode === "other" && (!data.custom_concept || data.custom_concept.trim() === '')) return false;
    return true;
}, { message: "Escribe el concepto", path: ["custom_concept"] })
    .refine(data => {
        if (data.mode === "exam" && !data.concept_id) return false;
        return true;
    }, { message: "Selecciona un examen", path: ["concept_id"] });

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface RegisterPaymentDialogProps {
    mode: "exam" | "other";
    onSuccess?: () => void;
    children?: React.ReactNode;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function RegisterPaymentDialog({ mode, onSuccess, children }: RegisterPaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: catalogData } = useSWR("/api/v1/payments/catalog", fetcher);
    const concepts = useMemo(() => catalogData?.concepts || [], [catalogData?.concepts]);

    const form = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema) as any,
        defaultValues: {
            mode: mode,
            concept_id: "",
            custom_concept: "",
            amount: 0,
            base_amount: 0,
            first_name: "",
            last_name: "",
            email: "",
            institution: "",
            quantity: 1,
            discount: 0,
            currency: "MXN",
            payment_method: "",
            notes: "",
        },
    });

    // Sync mode prop changes internally if the dialog remains mounted for different instances
    useEffect(() => {
        form.setValue("mode", mode);
    }, [mode, form]);

    // Auto-fill base_amount when concept changes (if mode === exam)
    const selectedConceptId = form.watch("concept_id");
    useEffect(() => {
        if (mode === "exam" && selectedConceptId) {
            const concept = concepts.find((c: any) => c.id === selectedConceptId);
            if (concept) {
                form.setValue("base_amount", Number(concept.cost));
                if (concept.currency) {
                    form.setValue("currency", concept.currency);
                }
            }
        }
    }, [selectedConceptId, concepts, form, mode]);

    // Reactive computation of total amount
    const qty = form.watch("quantity") || 1;
    const disc = form.watch("discount") || 0;
    const baseAmt = form.watch("base_amount") || 0;

    useEffect(() => {
        const total = (baseAmt * qty) - disc;
        form.setValue("amount", total > 0 ? total : 0);
    }, [qty, disc, baseAmt, form]);

    async function onSubmit(values: PaymentFormValues) {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/v1/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Error al registrar el pago");
            }

            toast.success("Pago registrado exitosamente");
            setOpen(false);
            form.reset({
                ...form.formState.defaultValues,
                mode,
            });
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Hubo un problema al registrar el pago");
        } finally {
            setIsSubmitting(false);
        }
    }

    const currentTotal = form.watch("amount");
    const currentCurrency = form.watch("currency");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button className={mode === "exam" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}>
                        <Plus className="mr-2 h-4 w-4" /> Registrar un Pago {mode === 'exam' ? 'EXAMEN' : 'OTRO'}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-xl">
                        {mode === 'exam' ? <CreditCard className="mr-2 h-6 w-6 text-emerald-600" /> : <Receipt className="mr-2 h-6 w-6 text-blue-600" />}
                        {mode === 'exam' ? 'Registrar Pago de Examen' : 'Registrar Pago (Otro Concepto)'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">

                        {/* Section 1: Concept */}
                        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
                            <div className="col-span-2 text-sm text-muted-foreground">
                                El folio se asigna al guardar (PAG-AAAA-NNNNN).
                            </div>
                            {mode === "exam" ? (
                                <FormField
                                    control={form.control}
                                    name="concept_id"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Examen del Catálogo</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Busca examen..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="max-h-[300px]">
                                                    {concepts.map((c: any) => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.description} ({c.concept_key})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="custom_concept"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Concepto Libre</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej. Curso de verano..." {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        {/* Section 2: Contact Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Información del Cliente</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombres</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Escribe los nombres..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Apellidos</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Escribe los apellidos..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="correo@ejemplo.com" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="institution"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Institución (Escuela/Empresa)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Opcional..." {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Section 3: Financials */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detalles Monetarios</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="base_amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Base</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    disabled={mode === "exam"}
                                                    title={mode === "exam" ? "Establecido por el catálogo" : ""}
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cantidad</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.value === "" ? 1 : parseInt(e.target.value, 10))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="discount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descuento Directo</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="currency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Moneda</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona Moneda" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MXN">Peso Mexicano (MXN)</SelectItem>
                                                    <SelectItem value="USD">Dólar (USD)</SelectItem>
                                                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="payment_method"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Método de Pago</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona el método..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="BBVA">BBVA</SelectItem>
                                                    <SelectItem value="Scotia Bank">Scotia Bank</SelectItem>
                                                    <SelectItem value="Pago en Mostrador">Pago en Mostrador</SelectItem>
                                                    <SelectItem value="Pago en Línea por Pay Pal">Pago en Línea por Pay Pal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Total Highlight */}
                        <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 flex justify-between items-center">
                            <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Total Calculado</span>
                            <span className="text-2xl font-bold text-lec-blue">
                                ${currentTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currentCurrency}
                            </span>
                        </div>

                        {/* Section 4: Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas y Observaciones</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Cualquier información adicional del pago..."
                                            className="resize-none"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4 border-t">
                            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto min-w-[150px] font-semibold">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ejecutar Registro
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
