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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Key } from "lucide-react";
import { toast } from "sonner";

const examCodeSchema = z.object({
    exam_type: z.string().min(1, "El tipo de examen es requerido"),
    code: z.string().min(1, "El código es requerido"),
    status: z.enum(["AVAILABLE", "USED", "EXPIRED"]),
    registration_date: z.string().optional(),
    expiration_date: z.string().optional(),
});

type ExamCodeValues = z.infer<typeof examCodeSchema>;

interface AddExamCodeDialogProps {
    onSuccess?: () => void;
}

export function AddExamCodeDialog({ onSuccess }: AddExamCodeDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ExamCodeValues>({
        resolver: zodResolver(examCodeSchema) as any,
        defaultValues: {
            exam_type: "",
            code: "",
            status: "AVAILABLE",
            registration_date: new Date().toISOString().slice(0, 10),
            expiration_date: "",
        },
    });

    async function onSubmit(values: ExamCodeValues) {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/v1/exam-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!response.ok) throw new Error("Error al registrar el código");

            toast.success("Código de examen registrado");
            setOpen(false);
            form.reset();
            onSuccess?.();
        } catch {
            toast.error("Hubo un problema al registrar el código");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#002e5d] hover:bg-[#001f3f]">
                    <Plus className="mr-2 h-4 w-4" /> Agregar Código
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Key className="mr-2 h-5 w-5" /> Nuevo Código de Examen
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="exam_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Examen / Certificación</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona el examen..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="KET">KET (A2 Key)</SelectItem>
                                            <SelectItem value="PET">PET (B1 Preliminary)</SelectItem>
                                            <SelectItem value="FCE">FCE (B2 First)</SelectItem>
                                            <SelectItem value="CAE">CAE (C1 Advanced)</SelectItem>
                                            <SelectItem value="CPE">CPE (C2 Proficiency)</SelectItem>
                                            <SelectItem value="IELTS">IELTS</SelectItem>
                                            <SelectItem value="LINGUASKILL">Linguaskill</SelectItem>
                                            <SelectItem value="TKT">TKT</SelectItem>
                                            <SelectItem value="ITEP">iTEP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código / Voucher</FormLabel>
                                    <FormControl>
                                        <Input placeholder="VOU-XXX-XXX" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="registration_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha de Registro</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="expiration_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vencimiento</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#002e5d] hover:bg-[#001f3f]">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
