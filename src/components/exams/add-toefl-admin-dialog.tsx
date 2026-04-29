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
import { Plus, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

const adminSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    start_date: z.string().min(1, "La fecha de inicio es requerida"),
    end_date: z.string().min(1, "La fecha de finalización es requerida"),
});

type AdminFormValues = z.infer<typeof adminSchema>;

interface AddToeflAdminDialogProps {
    onSuccess?: () => void;
}

export function AddToeflAdminDialog({ onSuccess }: AddToeflAdminDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<AdminFormValues>({
        resolver: zodResolver(adminSchema),
        defaultValues: {
            name: "",
            start_date: "",
            end_date: "",
        },
    });

    async function onSubmit(values: AdminFormValues) {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/v1/toefl/administrations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!response.ok) throw new Error("Error al crear la administración");

            toast.success("Administración TOEFL creada exitosamente");
            setOpen(false);
            form.reset();
            onSuccess?.();
        } catch {
            toast.error("Hubo un problema al crear la administración");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Crear TOEFL Administration
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-[#ff3000]">
                        <Calendar className="mr-2 h-5 w-5" /> Nueva Administración
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre de la Administración</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Sesión Mayo 2026" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="start_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha de inicio</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="end_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha de finalización</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#3b82f6] hover:bg-[#2563eb]">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
