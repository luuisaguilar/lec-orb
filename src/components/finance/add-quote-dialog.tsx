"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const quoteSchema = z.object({
    folio: z.string().min(1, "El folio es requerido"),
    provider: z.string().min(1, "El proveedor es requerido"),
    description: z.string().default(""),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface Prospect {
    id: string;
    name: string;
    company: string | null;
    service_interest: string | null;
}

interface AddQuoteDialogProps {
    onSuccess?: () => void;
    /** When provided, the dialog opens controlled and pre-fills from the prospect */
    prospect?: Prospect | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddQuoteDialog({ onSuccess, prospect, open: controlledOpen, onOpenChange }: AddQuoteDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? (v: boolean) => onOpenChange?.(v) : setInternalOpen;

    const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteSchema) as any,
        defaultValues: {
            folio: `COT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-`,
            provider: prospect?.company ?? prospect?.name ?? "",
            description: prospect?.service_interest ? `Cotización para ${prospect.name}${prospect.company ? ` (${prospect.company})` : ""} — ${prospect.service_interest}` : "",
            status: "PENDING",
        },
    });

    async function onSubmit(values: QuoteFormValues) {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/v1/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...values, prospect_id: prospect?.id ?? null }),
            });

            if (!response.ok) throw new Error("Error al crear la cotización");

            toast.success("Cotización creada exitosamente");
            setOpen(false);
            form.reset();
            onSuccess?.();
        } catch {
            toast.error("Hubo un problema al crear la cotización");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Cotización
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {prospect ? `Cotización — ${prospect.name}` : "Agregar Nueva Cotización"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="folio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Folio</FormLabel>
                                    <FormControl>
                                        <Input placeholder="COT-20260305-01" {...field} />
                                    </FormControl>
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
                                            placeholder="Detalles de la cotización..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estatus Inicial</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
