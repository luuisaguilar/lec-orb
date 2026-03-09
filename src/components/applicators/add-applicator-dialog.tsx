"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const LOCATION_ZONES = [
    { value: "Hermosillo", label: "Hermosillo" },
    { value: "Obregón", label: "Cd. Obregón" },
    { value: "Baja California", label: "Baja California" },
];

export const EXAM_TYPES = [
    "YLE",
    "KET",
    "PET",
    "FCE"
];

export function AddApplicatorDialog({
    open,
    onOpenChange,
    onSuccess,
    initialData,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSuccess: (updatedId?: string) => void;
    initialData?: any;
}) {
    const { t } = useI18n();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedExams, setSelectedExams] = useState<string[]>(initialData?.authorized_exams || []);
    const [locationZone, setLocationZone] = useState<string>(initialData?.location_zone || "");

    // Reset state when opened/closed if not editing
    if (!open && selectedExams.length > 0 && !initialData) {
        setSelectedExams([]);
    }

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setIsSubmitting(true);
            const fd = new FormData(e.currentTarget);
            const isEditing = !!initialData;
            const url = isEditing ? `/api/v1/applicators/${initialData.id}` : "/api/v1/applicators";
            const method = isEditing ? "PATCH" : "POST";

            try {
                const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: fd.get("name"),
                        external_id: fd.get("external_id") || null,
                        birth_date: fd.get("birth_date") || null,
                        city: fd.get("city") || null,
                        location_zone: locationZone || null,
                        email: fd.get("email") || null,
                        phone: fd.get("phone") || null,
                        rate_per_hour: fd.get("rate") ? Number(fd.get("rate")) : null,
                        roles: (fd.get("roles") as string)?.split(",").map((r) => r.trim()).filter(Boolean) || [],
                        certified_levels: (fd.get("levels") as string)?.split(",").map((l) => l.trim()).filter(Boolean) || [],
                        authorized_exams: selectedExams,
                        notes: fd.get("notes") || null,
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    toast.success(isEditing ? "Aplicador actualizado" : "Aplicador creado");
                    onSuccess(data.applicator?.id || initialData?.id);
                } else {
                    toast.error("Error al guardar aplicador");
                }
            } catch {
                toast.error("Error");
            } finally {
                setIsSubmitting(false);
            }
        },
        [initialData, locationZone, onSuccess, selectedExams]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? t("common.edit") : t("common.create")} — {t("applicators.title")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="external_id">ID (Externo)</Label>
                            <Input id="external_id" name="external_id" defaultValue={initialData?.external_id || ""} placeholder="Ej. 12345" autoFocus />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="name">{t("applicators.name")} *</Label>
                            <Input id="name" name="name" defaultValue={initialData?.name || ""} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                            <Input id="birth_date" name="birth_date" type="date" defaultValue={initialData?.birth_date || ""} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="city">Ciudad de Origen</Label>
                            <Input id="city" name="city" placeholder="Ej. Hermosillo" defaultValue={initialData?.city || ""} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Zona / Sede Presencial</Label>
                        <Select value={locationZone} onValueChange={setLocationZone}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sin zona asignada" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin zona asignada</SelectItem>
                                {LOCATION_ZONES.map(z => (
                                    <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1 col-span-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" name="email" type="email" placeholder="ejemplo@correo.com" defaultValue={initialData?.email || ""} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" name="phone" type="tel" placeholder="10 dígitos" defaultValue={initialData?.phone || ""} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="rate">Tarifa x Hora ($)</Label>
                            <Input id="rate" name="rate" type="number" min="0" step="0.01" placeholder="Ej. 150" defaultValue={initialData?.rate_per_hour || ""} />
                        </div>
                    </div>
                    <div className="space-y-2 border-t pt-2 mt-2">
                        <Label className="font-semibold">Exámenes Autorizados</Label>
                        <div className="grid grid-cols-2 mb-1 text-[10px] text-muted-foreground pb-2 border-b">
                            <p className="col-span-2">Selecciona los exámenes que este aplicador puede administrar.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {EXAM_TYPES.map((exam) => (
                                <div key={exam} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={exam}
                                        checked={selectedExams.includes(exam)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedExams(prev => [...prev, exam]);
                                            } else {
                                                setSelectedExams(prev => prev.filter(e => e !== exam));
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor={exam}
                                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {exam}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1 border-t pt-2 mt-2">
                        <Label htmlFor="notes">Notas o Comentarios Adicionales</Label>
                        <Input id="notes" name="notes" placeholder="Ej. No trabaja fines de semana" defaultValue={initialData?.notes || ""} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("common.create")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
