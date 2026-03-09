"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

const EDUCATIONAL_LEVELS = [
    { id: "PRIMARIA", label: "Primaria" },
    { id: "SECUNDARIA", label: "Secundaria" },
    { id: "PREPARATORIA", label: "Preparatoria" },
    { id: "UNIVERSIDAD", label: "Universidad" },
    { id: "MAESTRIA", label: "Maestría" },
];

const schoolSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    address: z.string().optional(),
    city: z.string().optional(),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    contact_email: z.string().email("Correo inválido").optional().or(z.literal("")),
    levels: z.array(z.string()),
    operating_hours: z.object({
        open: z.string().min(1, "Requerido"),
        close: z.string().min(1, "Requerido"),
    }),
    notes: z.string().optional(),
});

type SchoolFormValues = z.infer<typeof schoolSchema>;

interface AddSchoolDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (id?: string) => void;
    initialData?: any;
}

export function AddSchoolDialog({ open, onOpenChange, onSuccess, initialData }: AddSchoolDialogProps) {
    const { t } = useI18n();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SchoolFormValues>({
        resolver: zodResolver(schoolSchema) as any,
        defaultValues: initialData || {
            name: "",
            address: "",
            city: "",
            contact_name: "",
            contact_phone: "",
            contact_email: "",
            operating_hours: { open: "07:00", close: "15:00" },
            levels: [],
            notes: "",
        },
    });

    // Reset form when opened or initialData changes
    useState(() => {
        if (open) {
            form.reset(initialData || {
                name: "", address: "", city: "", contact_name: "", contact_phone: "", contact_email: "", levels: [], notes: "", operating_hours: { open: "07:00", close: "15:00" }
            });
        }
    });

    async function onSubmit(data: SchoolFormValues) {
        setIsSubmitting(true);
        const isEditing = !!initialData;
        const url = isEditing ? `/api/v1/schools/${initialData.id}` : "/api/v1/schools";
        const method = isEditing ? "PATCH" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const json = await res.json();

            if (!res.ok) {
                toast.error(json.error || "Error al guardar colegio");
                return;
            }

            toast.success(isEditing ? "Colegio/Sede actualizado" : "Colegio/Sede creado correctamente");
            form.reset();
            onSuccess(json.school?.id || initialData?.id);
        } catch {
            toast.error("Error de conexión");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {initialData ? t("common.edit") : t("common.create")} — Colegio / Sede
                    </DialogTitle>
                    <DialogDescription>
                        Ingresa los datos generales, niveles educativos que manejan y los salones disponibles si fungirá como sede.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* General Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Información General</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre del Colegio *</Label>
                                <Input id="name" placeholder="Instituto Ejemplo" {...form.register("name")} />
                                {form.formState.errors.name && (
                                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="city">Ciudad</Label>
                                <Input id="city" placeholder="Ej. Ciudad de México" {...form.register("city")} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">{t("schools.address")}</Label>
                                <Input id="address" placeholder="Av. Principal 123" {...form.register("address")} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="op_open">Hora Apertura (Sede) *</Label>
                                <Input id="op_open" type="time" {...form.register("operating_hours.open")} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="op_close">Hora Cierre (Sede) *</Label>
                                <Input id="op_close" type="time" {...form.register("operating_hours.close")} />
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Contacto</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact_name">Nombre de Contacto</Label>
                                <Input id="contact_name" placeholder="Lic. María Pérez" {...form.register("contact_name")} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact_phone">{t("common.phone")}</Label>
                                <Input id="contact_phone" placeholder="55 1234 5678" {...form.register("contact_phone")} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact_email">{t("common.email")}</Label>
                                <Input id="contact_email" type="email" placeholder="maria@instituto.mx" {...form.register("contact_email")} />
                                {form.formState.errors.contact_email && (
                                    <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Educational Levels */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Niveles Educativos</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {EDUCATIONAL_LEVELS.map((level) => (
                                <div key={level.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`level-${level.id}`}
                                        checked={form.watch("levels").includes(level.id)}
                                        onCheckedChange={(checked) => {
                                            const currentLevels = form.watch("levels") || [];
                                            if (checked) {
                                                form.setValue("levels", [...currentLevels, level.id]);
                                            } else {
                                                form.setValue("levels", currentLevels.filter((l) => l !== level.id));
                                            }
                                        }}
                                    />
                                    <Label htmlFor={`level-${level.id}`} className="font-normal cursor-pointer">
                                        {level.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">{t("inventory.notes")}</Label>
                        <Input id="notes" placeholder="Comentarios adicionales..." {...form.register("notes")} />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? t("common.save") : "Crear Colegio/Sede"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
