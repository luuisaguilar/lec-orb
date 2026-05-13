"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleField } from "@/components/dynamic/DynamicModule";

interface DynamicFormProps {
    moduleSlug: string;
    fields: ModuleField[];
    recordId?: string;
    defaultValues?: Record<string, any>;
    onSuccess: (record: any) => void;
    onCancel: () => void;
}

const STAGE_COLORS = [
    "bg-zinc-100 text-zinc-700 border-zinc-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-red-100 text-red-700 border-red-200",
];

const FULL_WIDTH = new Set(["textarea", "boolean", "url", "formula", "status"]);

function FieldInput({ field, value, onChange }: {
    field: ModuleField;
    value: any;
    onChange: (v: any) => void;
}) {
    switch (field.field_type) {
        case "textarea":
            return (
                <Textarea
                    id={`f-${field.name}`}
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder={`Escribe aquí...`}
                />
            );
        case "number":
            return (
                <Input id={`f-${field.name}`} type="number" value={value ?? ""}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                    min={field.options?.min} max={field.options?.max} />
            );
        case "currency":
            return (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                    <Input id={`f-${field.name}`} type="number" value={value ?? ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        min={0} step={0.01} className="pl-7" placeholder="0.00" />
                </div>
            );
        case "date":
            return <Input id={`f-${field.name}`} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
        case "datetime":
            return <Input id={`f-${field.name}`} type="datetime-local" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
        case "email":
            return <Input id={`f-${field.name}`} type="email" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="correo@ejemplo.com" />;
        case "phone":
            return <Input id={`f-${field.name}`} type="tel" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="+52 (664) 000-0000" />;
        case "url":
            return <Input id={`f-${field.name}`} type="url" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://" />;
        case "boolean":
            return (
                <div className="flex items-center gap-2.5 h-9">
                    <Checkbox id={`f-${field.name}`} checked={!!value} onCheckedChange={(c) => onChange(!!c)} className="h-5 w-5" />
                    <label htmlFor={`f-${field.name}`} className="text-sm text-muted-foreground cursor-pointer select-none">
                        Sí — {field.label}
                    </label>
                </div>
            );
        case "select": {
            const choices: string[] = field.options?.choices ?? [];
            return (
                <Select value={value ?? ""} onValueChange={onChange}>
                    <SelectTrigger id={`f-${field.name}`}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{choices.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
            );
        }
        case "status": {
            const stages: string[] = field.options?.stages ?? [];
            return (
                <div className="flex flex-wrap gap-2 pt-0.5">
                    {stages.map((stage, idx) => (
                        <button key={stage} type="button" onClick={() => onChange(stage)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                                STAGE_COLORS[idx % STAGE_COLORS.length],
                                value === stage ? "ring-2 ring-offset-1 ring-current scale-105 shadow-sm" : "opacity-50 hover:opacity-80"
                            )}>
                            {stage}
                        </button>
                    ))}
                </div>
            );
        }
        case "formula":
            return <Input id={`f-${field.name}`} value={value ?? ""} readOnly disabled className="opacity-50" placeholder="Calculado automáticamente" />;
        default:
            return <Input id={`f-${field.name}`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
}

export default function DynamicForm({ moduleSlug, fields, recordId, defaultValues = {}, onSuccess, onCancel }: DynamicFormProps) {
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        const init: Record<string, any> = {};
        for (const field of fields) {
            if (field.field_type === "formula") continue;
            init[field.name] = defaultValues[field.name] ?? field.default_value ?? null;
        }
        return init;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isEdit = !!recordId;
    const inputFields = fields.filter((f) => f.field_type !== "formula");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const missing = inputFields.filter((f) => f.is_required && !formData[f.name]);
        if (missing.length > 0) { setError(`Campos requeridos: ${missing.map((f) => f.label).join(", ")}`); return; }
        setIsSubmitting(true);
        try {
            const url = isEdit ? `/api/v1/modules/${moduleSlug}/records/${recordId}` : `/api/v1/modules/${moduleSlug}/records`;
            const res = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: formData }) });
            const json = await res.json();
            if (!res.ok) { setError(json.error ?? "Error al guardar"); return; }
            onSuccess(json.record);
        } catch (err: any) {
            setError(err.message ?? "Error inesperado");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {inputFields.map((field) => {
                    const full = FULL_WIDTH.has(field.field_type);
                    return (
                        <div key={field.id} className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
                            {field.field_type !== "boolean" && (
                                <Label htmlFor={`f-${field.name}`} className="text-sm font-medium flex items-center gap-1">
                                    {field.label}
                                    {field.is_required && <span className="text-destructive text-xs">*</span>}
                                </Label>
                            )}
                            <FieldInput field={field} value={formData[field.name]} onChange={(v) => setFormData((p) => ({ ...p, [field.name]: v }))} />
                        </div>
                    );
                })}
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}
            <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : isEdit ? "Guardar cambios" : "Crear registro"}
                </Button>
            </div>
        </form>
    );
}
