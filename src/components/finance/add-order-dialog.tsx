"use client";

import { useState } from "react";
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
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const orderSchema = z.object({
    quote_id: z.string().uuid().nullable(),
    provider: z.string().min(1, "El proveedor es requerido"),
    description: z.string().default(""),
    status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
});

type OrderFormValues = z.infer<typeof orderSchema>;

interface AddOrderDialogProps {
    onSuccess?: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AddOrderDialog({ onSuccess }: AddOrderDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch quotes to link them
    const { data: quotesData } = useSWR("/api/v1/quotes", fetcher);
    const quotes = quotesData?.quotes || [];

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(orderSchema) as any,
        defaultValues: {
            quote_id: null,
            provider: "",
            description: "",
            status: "PENDING",
        },
    });

    async function onSubmit(values: OrderFormValues) {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/v1/purchase-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!response.ok) throw new Error("Error al crear la orden de compra");

            toast.success("Orden de compra creada exitosamente");
            setOpen(false);
            form.reset();
            onSuccess?.();
        } catch {
            toast.error("Hubo un problema al crear la orden de compra");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Orden
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Agregar Nueva Orden de Compra</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            El folio se asigna automáticamente al crear la orden (formato OC-AAAA-NNNNN).
                        </p>
                        <FormField
                            control={form.control}
                            name="quote_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Vincular a Cotización (Opcional)</FormLabel>
                                    <Select
                                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                                        defaultValue={field.value || "none"}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una cotización" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Ninguna</SelectItem>
                                            {quotes.map((q: any) => (
                                                <SelectItem key={q.id} value={q.id}>
                                                    {q.folio} - {q.provider}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
                                            placeholder="Detalles de la compra..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Orden
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
