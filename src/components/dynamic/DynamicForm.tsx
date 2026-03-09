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
import type { ModuleField } from "@/components/dynamic/DynamicModule";

// ─────────────────────────────────────────────────────────────────────────────

interface DynamicFormProps {
    moduleSlug: string;
    fields: ModuleField[];
    recordId?: string;              // If provided, it's an edit form (PATCH)
    defaultValues?: Record<string, any>; // For edit mode
    onSuccess: (record: any) => void;
    onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field renderers
// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
    field: ModuleField;
    value: any;
    onChange: (value: any) => void;
}

function FieldRenderer({ field, value, onChange }: FieldProps) {
    const baseInputClass = "w-full";

    switch (field.field_type) {
        case "text":
            return (
                <Input
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={field.options?.max_length ?? 255}
                    className={baseInputClass}
                />
            );

        case "textarea":
            return (
                <Textarea
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    maxLength={field.options?.max_length ?? 5000}
                    className={baseInputClass}
                />
            );

        case "number":
            return (
                <Input
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                    min={field.options?.min}
                    max={field.options?.max}
                    step={field.options?.decimals ? 10 ** -field.options.decimals : 1}
                    className={baseInputClass}
                />
            );

        case "currency":
            return (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                        type="number"
                        value={value ?? ""}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                        min={0}
                        step={0.01}
                        className={`pl-7 ${baseInputClass}`}
                    />
                </div>
            );

        case "date":
            return (
                <Input
                    type="date"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                />
            );

        case "datetime":
            return (
                <Input
                    type="datetime-local"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                />
            );

        case "email":
            return (
                <Input
                    type="email"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                />
            );

        case "phone":
            return (
                <Input
                    type="tel"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                />
            );

        case "url":
            return (
                <Input
                    type="url"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="https://"
                    className={baseInputClass}
                />
            );

        case "boolean":
            return (
                <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                        checked={!!value}
                        onCheckedChange={(checked) => onChange(!!checked)}
                    />
                    <span className="text-sm text-muted-foreground">{field.label}</span>
                </div>
            );

        case "select":
        case "status": {
            const choices: string[] = field.options?.choices ?? field.options?.stages ?? [];
            return (
                <Select value={value ?? ""} onValueChange={onChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                        {choices.map((choice) => (
                            <SelectItem key={choice} value={choice}>
                                {choice}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        case "formula":
            // Formula fields are read-only (calculated server-side or in the future)
            return (
                <Input
                    value={value ?? ""}
                    readOnly
                    disabled
                    className={`${baseInputClass} opacity-60`}
                    placeholder="Calculado automáticamente"
                />
            );

        default:
            return (
                <Input
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                />
            );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DynamicForm
// ─────────────────────────────────────────────────────────────────────────────

export default function DynamicForm({
    moduleSlug,
    fields,
    recordId,
    defaultValues = {},
    onSuccess,
    onCancel,
}: DynamicFormProps) {
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        // Initialize with defaults from field definitions + any passed defaults
        const init: Record<string, any> = {};
        for (const field of fields) {
            if (field.field_type === "formula") continue; // skip formula fields
            init[field.name] = defaultValues[field.name] ?? field.default_value ?? null;
        }
        return init;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEdit = !!recordId;

    const handleFieldChange = (name: string, value: any) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Required field validation
        const missingRequired = fields.filter(
            (f) => f.is_required && f.field_type !== "formula" && !formData[f.name]
        );
        if (missingRequired.length > 0) {
            setError(`Campos requeridos: ${missingRequired.map((f) => f.label).join(", ")}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const url = isEdit
                ? `/api/v1/modules/${moduleSlug}/records/${recordId}`
                : `/api/v1/modules/${moduleSlug}/records`;

            const res = await fetch(url, {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: formData }),
            });

            const json = await res.json();
            if (!res.ok) {
                setError(json.error ?? "Error al guardar");
                return;
            }

            onSuccess(json.record);
        } catch (err: any) {
            setError(err.message ?? "Error inesperado");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputFields = fields.filter((f) => f.field_type !== "formula");

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {inputFields.map((field) => (
                <div key={field.id} className="flex flex-col gap-1.5">
                    <Label htmlFor={`field-${field.name}`} className="flex items-center gap-1">
                        {field.label}
                        {field.is_required && <span className="text-destructive text-xs">*</span>}
                    </Label>
                    <FieldRenderer
                        field={field}
                        value={formData[field.name]}
                        onChange={(v) => handleFieldChange(field.name, v)}
                    />
                </div>
            ))}

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear registro"}
                </Button>
            </div>
        </form>
    );
}
