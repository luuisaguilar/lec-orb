"use client";

import { useState } from "react";
import useSWR from "swr";
import {
    ArrowLeft, Plus, GripVertical, Trash2, Eye, EyeOff,
    ExternalLink, Settings, Type, Hash, Calendar, ToggleLeft,
    DollarSign, Mail, Phone, List, Star
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getIcon } from "@/lib/icon-registry";

// ─────────────────────────────────────────────────────────────────────────────

interface ModuleField {
    id: string;
    module_id: string;
    name: string;
    label: string;
    field_type: string;
    is_required: boolean;
    show_in_list: boolean;
    is_searchable: boolean;
    sort_order: number;
    options: any;
}

interface Props {
    module: {
        id: string;
        slug: string;
        name: string;
        icon: string;
        description?: string;
    };
    initialFields: ModuleField[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Field type configuration
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_TYPES = [
    { value: "text", label: "Texto", icon: Type },
    { value: "textarea", label: "Texto largo", icon: Type },
    { value: "number", label: "Número", icon: Hash },
    { value: "currency", label: "Moneda ($)", icon: DollarSign },
    { value: "date", label: "Fecha", icon: Calendar },
    { value: "datetime", label: "Fecha y hora", icon: Calendar },
    { value: "boolean", label: "Sí / No", icon: ToggleLeft },
    { value: "select", label: "Lista de opciones", icon: List },
    { value: "status", label: "Estado / Etapa", icon: Star },
    { value: "email", label: "Correo", icon: Mail },
    { value: "phone", label: "Teléfono", icon: Phone },
    { value: "url", label: "URL / Enlace", icon: ExternalLink },
];

const FIELD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    FIELD_TYPES.map((f) => [f.value, f.label])
);

// ─────────────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StudioEditorClient({ module, initialFields }: Props) {
    const { data, mutate } = useSWR(`/api/v1/modules/${module.slug}/fields`, fetcher, {
        fallbackData: { fields: initialFields },
    });
    const fields: ModuleField[] = data?.fields ?? [];

    const [showAddField, setShowAddField] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    const [newField, setNewField] = useState({
        name: "",
        label: "",
        field_type: "text",
        is_required: false,
        show_in_list: true,
        is_searchable: false,
        options: {} as any,
        choicesInput: "", // for select/status types
    });

    const handleLabelChange = (label: string) => {
        const name = label
            .toLowerCase()
            .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
            .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
            .replace(/[úùü]/g, "u").replace(/ñ/g, "n")
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
        setNewField((f) => ({ ...f, label, name }));
    };

    const handleAddField = async () => {
        setAddError(null);
        if (!newField.label || !newField.name) {
            setAddError("Etiqueta y nombre son requeridos");
            return;
        }

        // Build options based on field type
        const options: any = {};
        if (["select", "status"].includes(newField.field_type) && newField.choicesInput) {
            const choices = newField.choicesInput.split(",").map((c) => c.trim()).filter(Boolean);
            if (newField.field_type === "status") options.stages = choices;
            else options.choices = choices;
        }

        setAdding(true);
        try {
            const res = await fetch(`/api/v1/modules/${module.slug}/fields`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newField.name,
                    label: newField.label,
                    field_type: newField.field_type,
                    is_required: newField.is_required,
                    show_in_list: newField.show_in_list,
                    is_searchable: newField.is_searchable,
                    options,
                    sort_order: fields.length * 10,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setAddError(json.error ?? "Error al agregar campo");
                return;
            }
            setShowAddField(false);
            setNewField({ name: "", label: "", field_type: "text", is_required: false, show_in_list: true, is_searchable: false, options: {}, choicesInput: "" });
            mutate();
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteField = async (fieldId: string) => {
        if (!confirm("¿Eliminar este campo? Los datos existentes se perderán.")) return;
        // Direct Supabase call not available client-side, use a simple DELETE endpoint
        await fetch(`/api/v1/modules/${module.slug}/fields/${fieldId}`, { method: "DELETE" });
        mutate();
    };

    const handleToggleListVisibility = async (field: ModuleField) => {
        await fetch(`/api/v1/modules/${module.slug}/fields/${field.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ show_in_list: !field.show_in_list }),
        });
        mutate();
    };

    const ModuleIcon = getIcon(module.icon);
    const needsChoices = ["select", "status"].includes(newField.field_type);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/studio">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Studio
                    </Link>
                </Button>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-2">
                    <ModuleIcon className="h-5 w-5 text-muted-foreground" />
                    <h1 className="text-xl font-bold">{module.name}</h1>
                </div>
                <Badge variant="secondary" className="ml-auto">
                    {fields.length} campo{fields.length !== 1 ? "s" : ""}
                </Badge>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground flex-1">
                    Los cambios se aplican de inmediato a todos los registros.
                </span>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/m/${module.slug}`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver módulo
                    </Link>
                </Button>
            </div>

            {/* Fields list */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="font-semibold">Campos</h2>
                    <Button size="sm" onClick={() => setShowAddField(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar campo
                    </Button>
                </div>

                {fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                        <p className="text-sm text-muted-foreground">Sin campos todavía.</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddField(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Primer campo
                        </Button>
                    </div>
                )}

                {fields.map((field) => {
                    const FieldTypeIcon = FIELD_TYPES.find((t) => t.value === field.field_type)?.icon ?? Type;
                    return (
                        <div
                            key={field.id}
                            className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary/30 transition-colors"
                        >
                            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                <FieldTypeIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{field.label}</span>
                                    {field.is_required && (
                                        <Badge variant="destructive" className="text-xs py-0 px-1.5">Requerido</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground font-mono">{field.name}</span>
                                    <span className="text-xs text-muted-foreground">·</span>
                                    <span className="text-xs text-muted-foreground">
                                        {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title={field.show_in_list ? "Ocultar de la lista" : "Mostrar en la lista"}
                                    onClick={() => handleToggleListVisibility(field)}
                                >
                                    {field.show_in_list
                                        ? <Eye className="h-3.5 w-3.5" />
                                        : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                    }
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteField(field.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Field Dialog */}
            <Dialog open={showAddField} onOpenChange={setShowAddField}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Agregar campo</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex flex-col gap-1.5">
                            <Label>Tipo de campo</Label>
                            <Select
                                value={newField.field_type}
                                onValueChange={(v) => setNewField((f) => ({ ...f, field_type: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FIELD_TYPES.map((ft) => {
                                        const Ic = ft.icon;
                                        return (
                                            <SelectItem key={ft.value} value={ft.value}>
                                                <div className="flex items-center gap-2">
                                                    <Ic className="h-4 w-4" />
                                                    {ft.label}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Etiqueta (visible al usuario) <span className="text-destructive">*</span></Label>
                            <Input
                                value={newField.label}
                                onChange={(e) => handleLabelChange(e.target.value)}
                                placeholder="ej. Nombre del cliente"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Nombre interno (clave) <span className="text-destructive">*</span></Label>
                            <Input
                                value={newField.name}
                                onChange={(e) => setNewField((f) => ({ ...f, name: e.target.value }))}
                                placeholder="nombre_cliente"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones bajos</p>
                        </div>

                        {needsChoices && (
                            <div className="flex flex-col gap-1.5">
                                <Label>
                                    {newField.field_type === "status" ? "Etapas" : "Opciones"} (separadas por coma)
                                </Label>
                                <Input
                                    value={newField.choicesInput}
                                    onChange={(e) => setNewField((f) => ({ ...f, choicesInput: e.target.value }))}
                                    placeholder={newField.field_type === "status" ? "Borrador, Activo, Completado" : "Opción A, Opción B, Opción C"}
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-1 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="cursor-pointer">Campo requerido</Label>
                                <Switch
                                    checked={newField.is_required}
                                    onCheckedChange={(v) => setNewField((f) => ({ ...f, is_required: v }))}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="cursor-pointer">Mostrar en tabla</Label>
                                <Switch
                                    checked={newField.show_in_list}
                                    onCheckedChange={(v) => setNewField((f) => ({ ...f, show_in_list: v }))}
                                />
                            </div>
                        </div>

                        {addError && (
                            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{addError}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowAddField(false)} disabled={adding}>Cancelar</Button>
                        <Button onClick={handleAddField} disabled={adding}>
                            {adding ? "Agregando..." : "Agregar campo"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
