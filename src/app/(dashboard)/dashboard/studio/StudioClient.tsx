"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Settings, Layers, Trash2, Power, PowerOff, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getIcon, AVAILABLE_ICONS } from "@/lib/icon-registry";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ModuleEntry {
    id: string;
    slug: string;
    name: string;
    icon: string;
    description?: string;
    category?: string;
    is_native: boolean;
    is_active: boolean;
    sort_order: number;
}

// Categorías predefinidas + opción de escribir una nueva
const PRESET_CATEGORIES = [
    "Institucional",
    "Inventario",
    "Exámenes",
    "Catálogos",
    "Finanzas",
    "Ajustes",
    "Personalizado",
    "__nueva__",   // token especial para "Nueva categoría..."
];

// ─────────────────────────────────────────────────────────────────────────────
// CategoryPicker — Select + Input libre para categoría nueva
// ─────────────────────────────────────────────────────────────────────────────
function CategoryPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    // Si value no está en los presets → está en modo "nueva"
    const isCustom = !PRESET_CATEGORIES.includes(value) || value === "__nueva__";
    const [customInput, setCustomInput] = useState(isCustom && value !== "__nueva__" ? value : "");

    const handleSelect = (v: string) => {
        if (v === "__nueva__") {
            onChange(""); // limpia mientras escribe
        } else {
            setCustomInput("");
            onChange(v);
        }
    };

    const handleCustomInput = (v: string) => {
        setCustomInput(v);
        onChange(v);
    };

    const selectValue = PRESET_CATEGORIES.includes(value) ? value : "__nueva__";

    return (
        <div className="flex flex-col gap-1.5">
            <Select value={selectValue} onValueChange={handleSelect}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    {PRESET_CATEGORIES.slice(0, -1).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="__nueva__" className="text-primary font-medium">
                        + Nueva categoría...
                    </SelectItem>
                </SelectContent>
            </Select>
            {(selectValue === "__nueva__" || (isCustom && value !== "")) && (
                <Input
                    autoFocus
                    value={customInput}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    placeholder="Nombre de la nueva categoría"
                    className="text-sm"
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Delete Dialog
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmDeleteDialog({
    module,
    onConfirm,
    onCancel,
    deleting,
}: {
    module: ModuleEntry | null;
    onConfirm: () => void;
    onCancel: () => void;
    deleting: boolean;
}) {
    if (!module) return null;
    return (
        <Dialog open={!!module} onOpenChange={(open) => { if (!open) onCancel(); }}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Eliminar módulo
                    </DialogTitle>
                    <DialogDescription>
                        Estás a punto de eliminar el módulo <strong>{module.name}</strong>.
                        Esta acción también eliminará todos sus campos y registros permanentemente.
                        No se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 mt-1">
                    <p className="text-sm font-mono text-destructive">/dashboard/m/{module.slug}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Este módulo dejará de estar disponible de inmediato.</p>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <Button variant="ghost" onClick={onCancel} disabled={deleting}>Cancelar</Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
                        {deleting ? "Eliminando..." : "Sí, eliminar"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// StudioClient
// ─────────────────────────────────────────────────────────────────────────────
export default function StudioClient() {
    const { data, isLoading, mutate } = useSWR("/api/v1/modules", fetcher);
    const modules: ModuleEntry[] = data?.modules ?? [];

    // Create dialog
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: "",
        slug: "",
        icon: "FileText",
        description: "",
        category: "Personalizado",
    });

    // Delete dialog
    const [moduleToDelete, setModuleToDelete] = useState<ModuleEntry | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        const slug = name
            .toLowerCase()
            .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
            .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
            .replace(/[úùü]/g, "u").replace(/ñ/g, "n")
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        setForm((f) => ({ ...f, name, slug }));
    };

    const resetCreateForm = () => {
        setForm({ name: "", slug: "", icon: "FileText", description: "", category: "Personalizado" });
        setCreateError(null);
    };

    const handleCreate = async () => {
        setCreateError(null);
        if (!form.name || !form.slug) {
            setCreateError("Nombre y slug son requeridos");
            return;
        }
        if (!form.category || form.category.trim() === "") {
            setCreateError("La categoría es requerida");
            return;
        }
        setCreating(true);
        try {
            const res = await fetch("/api/v1/modules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok) {
                setCreateError(json.error ?? "Error al crear módulo");
                return;
            }
            setShowCreate(false);
            resetCreateForm();
            mutate();
        } finally {
            setCreating(false);
        }
    };

    const handleToggleActive = async (mod: ModuleEntry) => {
        await fetch(`/api/v1/modules/${mod.slug}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: !mod.is_active }),
        });
        mutate();
    };

    const handleDelete = async () => {
        if (!moduleToDelete) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/v1/modules/${moduleToDelete.slug}`, { method: "DELETE" });
            if (res.ok) {
                setModuleToDelete(null);
                mutate();
            }
        } finally {
            setDeleting(false);
        }
    };

    const customModules = modules.filter((m) => !m.is_native);
    const nativeModules = modules.filter((m) => m.is_native);
    const SelectedIcon = getIcon(form.icon);

    return (
        <div className="flex flex-col gap-8 p-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">LEC Studio</h1>
                        <p className="text-sm text-muted-foreground">Crea y gestiona módulos personalizados sin código</p>
                    </div>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo módulo
                </Button>
            </div>

            {/* Custom modules */}
            <section>
                <h2 className="text-lg font-semibold mb-3">Módulos personalizados</h2>
                {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
                {!isLoading && customModules.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                        <Layers className="h-8 w-8 text-muted-foreground mb-2" />
                        <h3 className="font-semibold">Sin módulos personalizados</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Crea tu primer módulo y agrega campos sin escribir código.
                        </p>
                        <Button className="mt-4" onClick={() => setShowCreate(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear módulo
                        </Button>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customModules.map((mod) => {
                        const Icon = getIcon(mod.icon);
                        return (
                            <div
                                key={mod.id}
                                className={`group relative rounded-xl border bg-card p-4 flex flex-col gap-3 transition-all ${!mod.is_active ? "opacity-60" : "hover:border-primary/40 hover:shadow-sm"}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                            <Icon className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{mod.name}</p>
                                            <p className="text-xs text-muted-foreground">{mod.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {mod.category && (
                                            <Badge variant="outline" className="text-xs hidden sm:flex">
                                                {mod.category}
                                            </Badge>
                                        )}
                                        <Badge variant={mod.is_active ? "secondary" : "outline"} className="text-xs">
                                            {mod.is_active ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </div>
                                </div>
                                {mod.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
                                )}
                                <div className="flex gap-2 mt-auto">
                                    <Button variant="outline" size="sm" asChild className="flex-1">
                                        <Link href={`/dashboard/studio/${mod.slug}`}>
                                            <Settings className="h-3 w-3 mr-1" />
                                            Configurar
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleActive(mod)}
                                        title={mod.is_active ? "Desactivar" : "Activar"}
                                    >
                                        {mod.is_active
                                            ? <PowerOff className="h-3 w-3" />
                                            : <Power className="h-3 w-3" />
                                        }
                                    </Button>
                                    {/* ── Botón Eliminar ── */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Eliminar módulo"
                                        onClick={() => setModuleToDelete(mod)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Native modules (read-only) */}
            <section>
                <h2 className="text-lg font-semibold mb-1">Módulos nativos</h2>
                <p className="text-sm text-muted-foreground mb-3">
                    Parte del núcleo de LEC Platform. No se pueden modificar desde el Studio.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {nativeModules.map((mod) => {
                        const Icon = getIcon(mod.icon);
                        return (
                            <div key={mod.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
                                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm truncate">{mod.name}</span>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Create Dialog ── */}
            <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetCreateForm(); } else setShowCreate(true); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo módulo personalizado</DialogTitle>
                        <DialogDescription>
                            Define un nombre y configura los campos después desde el editor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                        {/* Nombre */}
                        <div className="flex flex-col gap-1.5">
                            <Label>Nombre del módulo <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="ej. Seguimiento de Clientes"
                            />
                        </div>
                        {/* Slug */}
                        <div className="flex flex-col gap-1.5">
                            <Label>Slug (URL) <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.slug}
                                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                                placeholder="seguimiento-de-clientes"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Accesible en <code className="bg-muted px-1 rounded">/dashboard/m/{form.slug || "..."}</code>
                            </p>
                        </div>
                        {/* Ícono + Categoría */}
                        <div className="flex gap-3">
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Ícono</Label>
                                <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                                    <SelectTrigger>
                                        <div className="flex items-center gap-2">
                                            <SelectedIcon className="h-4 w-4" />
                                            <SelectValue />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {AVAILABLE_ICONS.map((icon) => {
                                            const Ic = getIcon(icon);
                                            return (
                                                <SelectItem key={icon} value={icon}>
                                                    <div className="flex items-center gap-2">
                                                        <Ic className="h-4 w-4" />
                                                        {icon}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Label>Categoría</Label>
                                <CategoryPicker
                                    value={form.category}
                                    onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                                />
                            </div>
                        </div>
                        {/* Descripción */}
                        <div className="flex flex-col gap-1.5">
                            <Label>Descripción (opcional)</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Para qué sirve este módulo..."
                                rows={2}
                            />
                        </div>
                        {createError && (
                            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{createError}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => { setShowCreate(false); resetCreateForm(); }} disabled={creating}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreate} disabled={creating}>
                            {creating ? "Creando..." : "Crear módulo"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Confirm Delete Dialog ── */}
            <ConfirmDeleteDialog
                module={moduleToDelete}
                onConfirm={handleDelete}
                onCancel={() => setModuleToDelete(null)}
                deleting={deleting}
            />
        </div>
    );
}
