"use client";

import { useState, useEffect } from "react";
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { AddApplicatorDialog } from "@/components/applicators/add-applicator-dialog";
import { CreateSchoolDialog } from "@/components/schools/create-school-dialog";

const addPackSchema = z.object({
    codigo: z.string().min(1, "El código es requerido"),
    nombre: z.string().default(""),
    status: z.enum(["EN_SITIO", "PRESTADO"]).default("EN_SITIO"),
    school_id: z.string().optional(),
    applicator_id: z.string().optional(),
    notes: z.string().default(""),
});

type AddPackForm = z.infer<typeof addPackSchema>;

interface School { id: string; name: string; }
interface Applicator { id: string; name: string; authorized_exams?: string[] | null; }

interface AddPackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialCode?: string;
}

export function AddPackDialog({ open, onOpenChange, onSuccess, initialCode }: AddPackDialogProps) {
    const { t } = useI18n();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [schools, setSchools] = useState<School[]>([]);
    const [applicators, setApplicators] = useState<Applicator[]>([]);

    // Inline create states
    const [showCreateSchool, setShowCreateSchool] = useState(false);
    const [showAddApplicator, setShowAddApplicator] = useState(false);

    const filteredApplicators = applicators.filter(a => a.authorized_exams && a.authorized_exams.length > 0);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<AddPackForm>({
        resolver: zodResolver(addPackSchema) as any,
        defaultValues: { status: "EN_SITIO", codigo: "" },
    });

    const statusValue = watch("status");

    // Load schools and applicators when dialog opens, and reset form
    useEffect(() => {
        if (!open) return;

        reset({
            codigo: initialCode || "",
            nombre: "",
            status: "EN_SITIO",
        });

        setShowCreateSchool(false);
        setShowAddApplicator(false);

        fetch("/api/v1/schools")
            .then(r => r.json())
            .then(d => setSchools(d.schools || []))
            .catch(() => { });
        fetch("/api/v1/applicators")
            .then(r => r.json())
            .then(d => setApplicators(d.applicators || []))
            .catch(() => { });
    }, [open, initialCode, reset]);

    function handleSchoolCreated(school: { id: string; name: string }) {
        setSchools(prev => [...prev, school as School]);
        setValue("school_id", school.id);
        setShowCreateSchool(false);
    }

    async function fetchApplicators() {
        try {
            const res = await fetch("/api/v1/applicators");
            const data = await res.json();
            setApplicators(data.applicators || []);
        } catch { }
    }

    async function onSubmit(data: AddPackForm) {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/v1/packs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                if (res.status === 409) {
                    toast.error(t("inventory.packExists"));
                } else {
                    toast.error(err.error || t("scan.error"));
                }
                return;
            }

            toast.success(t("inventory.packCreated"));
            reset();
            setShowCreateSchool(false);
            setShowAddApplicator(false);
            onSuccess();
        } catch {
            toast.error(t("scan.error"));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("inventory.addPack")}</DialogTitle>
                    <DialogDescription>{t("inventory.addPackDesc")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Código */}
                    <div className="space-y-2">
                        <Label htmlFor="codigo">{t("inventory.code")} *</Label>
                        <Input
                            id="codigo"
                            placeholder="SPK-001"
                            autoFocus
                            autoComplete="off"
                            {...register("codigo")}
                            className={errors.codigo ? "border-destructive" : ""}
                        />
                        {errors.codigo && (
                            <p className="text-xs text-destructive">{errors.codigo.message}</p>
                        )}
                    </div>

                    {/* Nombre */}
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Speaking Pack Test</Label>
                        <Input
                            id="nombre"
                            placeholder="Nombre del pack"
                            {...register("nombre")}
                        />
                    </div>

                    {/* Estatus */}
                    <div className="space-y-2">
                        <Label>Estatus</Label>
                        <Select
                            value={statusValue}
                            onValueChange={val => setValue("status", val as "EN_SITIO" | "PRESTADO")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona estatus" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EN_SITIO">En Sitio</SelectItem>
                                <SelectItem value="PRESTADO">Prestado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Colegio */}
                    <div className="space-y-2">
                        <Label>Aplicación / Colegio</Label>
                        <Select onValueChange={val => {
                            if (val === "__new__") {
                                setShowCreateSchool(true);
                            } else {
                                setValue("school_id", val);
                            }
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un colegio" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Colegios registrados</SelectLabel>
                                    {schools.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectItem value="__new__" className="text-primary font-medium">
                                    <Plus className="inline h-3 w-3 mr-1" />
                                    Registrar nuevo colegio
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Aplicador */}
                    <div className="space-y-2">
                        <Label>Aplicador</Label>
                        <Select onValueChange={val => {
                            if (val === "__new__") {
                                setShowAddApplicator(true);
                            } else {
                                setValue("applicator_id", val);
                                setShowAddApplicator(false);
                            }
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un aplicador" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Aplicadores registrados</SelectLabel>
                                    {filteredApplicators.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectItem value="__new__" className="text-primary font-medium">
                                    <Plus className="inline h-3 w-3 mr-1" />
                                    Registrar nuevo aplicador
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">{t("inventory.notes")}</Label>
                        <Input
                            id="notes"
                            placeholder={t("inventory.notes")}
                            {...register("notes")}
                        />
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

            {/* Full school registration dialog */}
            <CreateSchoolDialog
                open={showCreateSchool}
                onOpenChange={setShowCreateSchool}
                onCreated={handleSchoolCreated}
            />

            {/* Nested Add Applicator Dialog */}
            <AddApplicatorDialog
                open={showAddApplicator}
                onOpenChange={setShowAddApplicator}
                onSuccess={async (newId) => {
                    await fetchApplicators();
                    setShowAddApplicator(false);
                    if (newId) {
                        setValue("applicator_id", newId);
                    }
                }}
            />
        </Dialog>
    );
}
