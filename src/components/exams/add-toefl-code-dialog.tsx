"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useSWR from "swr";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const bulkToeflCodeSchema = z.object({
    test_type: z.string().min(1, "Selecciona el examen"),
    quantity: z.coerce.number().min(1, "Mínimo 1").max(500, "Máximo 500 a la vez"),
    purchase_order_id: z.string().uuid("Selecciona una OC").optional().or(z.literal("none")),
});

type BulkToeflCodeValues = z.infer<typeof bulkToeflCodeSchema>;

interface AddToeflCodeDialogProps {
    onSuccess?: () => void;
}

const ETS_TYPES = [
    "ETS | LECETS | TOEFLITP",
    "ETS | LECETS | TOEFLITPRL",
    "ETS | LECETS | TOEFLITPS",
    "ETS | LECETS | TOEFL PR JR PB - RL",
    "ETS | LECETS | TOEFL PR JR OL - RL",
    "ETS | LECETS | TOEFL PR JR OL - RLS",
    "ETS | LECETS | TOEFL PR JR OL - RLWS"
];

export function AddToeflCodeDialog({ onSuccess }: AddToeflCodeDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: posData, isLoading: posLoading } = useSWR(
        open ? "/api/v1/purchase-orders" : null,
        fetcher
    );

    const form = useForm({
        resolver: zodResolver(bulkToeflCodeSchema),
        defaultValues: {
            test_type: "",
            quantity: 1,
            purchase_order_id: "none",
        },
    });

    async function onSubmit(values: BulkToeflCodeValues) {
        setIsSubmitting(true);
        try {
            const payload = {
                ...values,
                purchase_order_id: values.purchase_order_id === "none" ? null : values.purchase_order_id,
            };

            const response = await fetch("/api/v1/toefl/codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Error al generar códigos");
            }

            toast.success(`Se reservaron ${values.quantity} espacios en inventario`);
            setOpen(false);
            form.reset();
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Hubo un problema al registrar los códigos");
        } finally {
            setIsSubmitting(false);
        }
    }

    const purchaseOrders = posData?.orders || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="font-semibold shadow-sm hover:shadow-md transition-all">
                    <Plus className="mr-2 h-4 w-4" /> Generar Lote de Códigos
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-xl text-lec-blue">
                        <Ticket className="mr-2 h-5 w-5" /> Nueva Orden de Códigos
                    </DialogTitle>
                    <DialogDescription>
                        Reserva los espacios vacíos generados a partir de una Orden de Compra.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="purchase_order_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Orden de Compra Relacionada</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={posLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={posLoading ? "Cargando OCs..." : "Ninguna / Crear sin OC"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Ninguna / Crear sin OC</SelectItem>
                                            {purchaseOrders.map((po: any) => (
                                                <SelectItem key={po.id} value={po.id}>
                                                    {po.folio} {po.description ? `| ${po.description}` : ''}
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
                            name="test_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Examen</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona el tipo exacto..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ETS_TYPES.map(type => (
                                                <SelectItem key={type} value={type}>
                                                    {type.split(' | ').pop()?.trim()}
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
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad de Códigos a Reservar</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={500}
                                            {...field}
                                            value={field.value as number}
                                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="font-semibold bg-emerald-600 hover:bg-emerald-700">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generar {String(form.watch("quantity") || 0)} Espacios
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
