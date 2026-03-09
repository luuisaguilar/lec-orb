"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, School } from "lucide-react";
import { toast } from "sonner";

const EDUCATIONAL_LEVELS = [
    { id: "PRIMARIA", label: "Primaria" },
    { id: "SECUNDARIA", label: "Secundaria" },
    { id: "PREPARATORIA", label: "Preparatoria" },
    { id: "UNIVERSIDAD", label: "Universidad" },
    { id: "MAESTRIA", label: "Maestría" },
];

const createSchoolSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    address: z.string().optional(),
    city: z.string().optional(),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
    levels: z.array(z.string()),
    operating_hours: z.object({
        open: z.string().min(1, "Requerido"),
        close: z.string().min(1, "Requerido"),
    }),
    notes: z.string().optional(),
});

type CreateSchoolForm = z.infer<typeof createSchoolSchema>;

interface CreateSchoolDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called with the newly created school { id, name } after success */
    onCreated: (school: { id: string; name: string }) => void;
}

export function CreateSchoolDialog({ open, onOpenChange, onCreated }: CreateSchoolDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CreateSchoolForm>({
        resolver: zodResolver(createSchoolSchema) as any,
        defaultValues: {
            levels: [],
            operating_hours: { open: "07:00", close: "15:00" },
        },
    });

    const selectedLevels = watch("levels") || [];

    function toggleLevel(id: string, checked: boolean) {
        if (checked) {
            setValue("levels", [...selectedLevels, id]);
        } else {
            setValue("levels", selectedLevels.filter((l) => l !== id));
        }
    }

    async function onSubmit(data: CreateSchoolForm) {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/v1/schools", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    contact_email: data.contact_email || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || "Error al crear el colegio");
                return;
            }
            toast.success(`Colegio "${json.school.name}" creado correctamente`);
            reset();
            onCreated(json.school);
            onOpenChange(false);
        } catch {
            toast.error("Error de conexión");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) { reset(); onOpenChange(v); } }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <School className="h-5 w-5 text-primary" />
                        <DialogTitle>Registrar nuevo colegio</DialogTitle>
                    </div>
                    <DialogDescription>
                        Completa los datos del colegio. Solo el nombre es obligatorio.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
                    {/* Nombre */}
                    <div className="space-y-1">
                        <Label htmlFor="s-name">Nombre del colegio *</Label>
                        <Input
                            id="s-name"
                            placeholder="Instituto Ejemplo"
                            autoFocus
                            {...register("name")}
                            className={errors.name ? "border-destructive" : ""}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    {/* Ciudad / Dirección */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="s-city">Ciudad</Label>
                            <Input id="s-city" placeholder="Monterrey" {...register("city")} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="s-address">Dirección</Label>
                            <Input id="s-address" placeholder="Calle y número" {...register("address")} />
                        </div>
                    </div>

                    {/* Horario de operación */}
                    <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Horario de Operación</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="s-open">Hora de apertura</Label>
                                <Input id="s-open" type="time" {...register("operating_hours.open")} />
                                {errors.operating_hours?.open && (
                                    <p className="text-xs text-destructive">{errors.operating_hours.open.message}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="s-close">Hora de cierre</Label>
                                <Input id="s-close" type="time" {...register("operating_hours.close")} />
                                {errors.operating_hours?.close && (
                                    <p className="text-xs text-destructive">{errors.operating_hours.close.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Niveles educativos */}
                    <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Niveles Educativos</p>
                        <div className="grid grid-cols-2 gap-2">
                            {EDUCATIONAL_LEVELS.map((level) => (
                                <div key={level.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`cs-level-${level.id}`}
                                        checked={selectedLevels.includes(level.id)}
                                        onCheckedChange={(checked) => toggleLevel(level.id, !!checked)}
                                    />
                                    <Label htmlFor={`cs-level-${level.id}`} className="font-normal cursor-pointer">
                                        {level.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contacto */}
                    <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</p>
                        <div className="space-y-1">
                            <Label htmlFor="s-cname">Nombre del contacto</Label>
                            <Input id="s-cname" placeholder="Nombre del coordinador" {...register("contact_name")} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="s-cphone">Teléfono</Label>
                                <Input id="s-cphone" placeholder="81 1234 5678" {...register("contact_phone")} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="s-cemail">Email</Label>
                                <Input
                                    id="s-cemail"
                                    type="email"
                                    placeholder="coord@colegio.mx"
                                    {...register("contact_email")}
                                    className={errors.contact_email ? "border-destructive" : ""}
                                />
                                {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-1">
                        <Label htmlFor="s-notes">Notas</Label>
                        <Input id="s-notes" placeholder="Observaciones adicionales" {...register("notes")} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar colegio
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
