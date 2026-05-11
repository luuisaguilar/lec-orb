"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const lineSchema = z.object({
    description: z.string().min(1, "Descripción requerida"),
    quantity: z.coerce.number().positive("Cantidad > 0"),
    unit_price: z.coerce.number().nonnegative("Precio válido"),
});

const quoteSchema = z.object({
    provider: z.string().min(1, "El proveedor es requerido"),
    description: z.string().default(""),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
    lines: z.array(lineSchema).min(1, "Agrega al menos una partida"),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface AddQuoteDialogProps {
    onSuccess?: () => void;
}

export function AddQuoteDialog({ onSuccess }: AddQuoteDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteSchema) as any,
        defaultValues: {
            provider: "",
            description: "",
            status: "PENDING",
            lines: [{ description: "", quantity: 1, unit_price: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

    async function onSubmit(values: QuoteFormValues) {
        setIsSubmitting(true);
        try {
            const items = values.lines.map((l) => ({
                description: l.description,
                quantity: l.quantity,
                unit_price: l.unit_price,
            }));
            const response = await fetch("/api/v1/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: values.provider,
                    description: values.description,
                    status: values.status,
                    items,
                }),
            });

            if (!response.ok) throw new Error("Error al crear la cotización");

            toast.success("Cotización creada exitosamente");
            setOpen(false);
            form.reset({
                provider: "",
                description: "",
                status: "PENDING",
                lines: [{ description: "", quantity: 1, unit_price: 0 }],
            });
            onSuccess?.();
        } catch {
            toast.error("Hubo un problema al crear la cotización");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Cotización
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Agregar Nueva Cotización</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            El folio se asigna automáticamente al crear la cotización (formato COT-AAAA-NNNNN).
                        </p>
                        <FormField
                            control={form.control}
                            name="provider"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Cambridge, ETS, Oxford..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalles de la cotización..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <FormLabel>Partidas</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ description: "", quantity: 1, unit_price: 0 })}
                                >
                                    <Plus className="mr-1 h-3 w-3" /> Línea
                                </Button>
                            </div>
                            <div className="rounded-md border divide-y">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-3 space-y-2 bg-muted/20">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Partida {index + 1}
                                            </span>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`lines.${index}.description`}
                                            render={({ field: f }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Concepto / descripción" {...f} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <FormField
                                                control={form.control}
                                                name={`lines.${index}.quantity`}
                                                render={({ field: f }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Cantidad</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.01" min={0} {...f} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`lines.${index}.unit_price`}
                                                render={({ field: f }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Precio unit.</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.01" min={0} {...f} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estatus Inicial</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un estatus" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="PENDING">Pendiente</SelectItem>
                                            <SelectItem value="APPROVED">Aprobada</SelectItem>
                                            <SelectItem value="REJECTED">Rechazada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Cotización
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
