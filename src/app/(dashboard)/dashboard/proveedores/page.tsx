"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
    Building2, Plus, Pencil, Trash2, Globe, Phone, Mail, Loader2, Tag, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Supplier {
    id: string;
    name: string;
    contact: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    category: string | null;
    notes: string | null;
}

const EMPTY = {
    name: "", contact: "", email: "", phone: "", website: "", category: "", notes: ""
};

export default function SuppliersPage() {
    const { data, isLoading, mutate } = useSWR("/api/v1/suppliers", fetcher);
    const [showDialog, setShowDialog] = useState(false);
    const [editing, setEditing] = useState<Supplier | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);

    // Search state
    const [searchTerm, setSearchTerm] = useState("");

    const suppliers = useMemo<Supplier[]>(() => data?.suppliers ?? [], [data?.suppliers]);

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => {
            const matchesSearch = 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.contact?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (s.category?.toLowerCase() || "").includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [suppliers, searchTerm]);

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY });
        setShowDialog(true);
    };

    const openEdit = (s: Supplier) => {
        setEditing(s);
        setForm({
            name: s.name,
            contact: s.contact ?? "",
            email: s.email ?? "",
            phone: s.phone ?? "",
            website: s.website ?? "",
            category: s.category ?? "",
            notes: s.notes ?? "",
        });
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("El nombre del proveedor es obligatorio");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                contact: form.contact || null,
                email: form.email || null,
                phone: form.phone || null,
                website: form.website || null,
                category: form.category || null,
                notes: form.notes || null,
            };
            const url = editing ? `/api/v1/suppliers/${editing.id}` : "/api/v1/suppliers";
            const method = editing ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Error al guardar");
            toast.success(editing ? "Proveedor actualizado" : "Proveedor creado");
            setShowDialog(false);
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Desactivar proveedor "${name}"?`)) return;
        try {
            const res = await fetch(`/api/v1/suppliers/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Proveedor desactivado");
            mutate();
        } catch {
            toast.error("Error al desactivar");
        }
    };

    const categoryColors: Record<string, string> = {
        "Cambridge": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
        "ETS TOEFL": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#0034a1]">Proveedores</h2>
                    <p className="text-muted-foreground font-medium">
                        Directorio de proveedores para órdenes de compra y exámenes.
                    </p>
                </div>
                <Button onClick={openCreate} className="bg-[#0034a1] hover:bg-[#0034a1]/90">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nombre, contacto o categoría..." 
                    className="pl-10 max-w-md" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <Card className="shadow-sm border-t-4 border-t-[#0034a1]">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                        <div className="flex items-center">
                            <Building2 className="mr-2 h-5 w-5 text-[#0034a1]" />
                            {filteredSuppliers.length} {filteredSuppliers.length === 1 ? 'proveedor' : 'proveedores'} {searchTerm ? 'filtrados' : 'registrados'}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-24 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredSuppliers.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center space-y-2 text-center">
                            <Building2 className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? 'No hay resultados para la búsqueda.' : 'No hay proveedores registrados aún.'}
                            </p>
                            {searchTerm && (
                                <Button variant="link" onClick={() => setSearchTerm("")}>
                                    Limpiar búsqueda
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead>Contacto</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Teléfono</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSuppliers.map((s) => (
                                        <TableRow key={s.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div>
                                                    <p className="font-semibold">{s.name}</p>
                                                    {s.website && (
                                                        <a href={s.website} target="_blank" rel="noopener noreferrer"
                                                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                                                            <Globe className="h-3 w-3" /> {s.website.replace(/^https?:\/\//, "")}
                                                        </a>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {s.category ? (
                                                    <Badge className={categoryColors[s.category] ?? "bg-slate-100 text-slate-700"}>
                                                        <Tag className="mr-1 h-3 w-3" />{s.category}
                                                    </Badge>
                                                ) : <span className="text-muted-foreground/50 text-xs italic">—</span>}
                                            </TableCell>
                                            <TableCell className="text-sm">{s.contact ?? <span className="text-muted-foreground/50 text-xs italic">—</span>}</TableCell>
                                            <TableCell>
                                                {s.email ? (
                                                    <a href={`mailto:${s.email}`} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                                                        <Mail className="h-3 w-3" /> {s.email}
                                                    </a>
                                                ) : <span className="text-muted-foreground/50 text-xs italic">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                {s.phone ? (
                                                    <span className="text-sm flex items-center gap-1">
                                                        <Phone className="h-3 w-3 text-muted-foreground" /> {s.phone}
                                                    </span>
                                                ) : <span className="text-muted-foreground/50 text-xs italic">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600"
                                                        onClick={() => handleDelete(s.id, s.name)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Nombre *</Label>
                            <Input placeholder="Ej: Cambridge University Press" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Categoría</Label>
                                <Input placeholder="Ej: Cambridge, ETS TOEFL" value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Contacto Principal</Label>
                                <Input placeholder="Nombre del contacto" value={form.contact}
                                    onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input type="email" placeholder="contacto@proveedor.com" value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Teléfono</Label>
                                <Input placeholder="+52 55 1234 5678" value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Sitio Web</Label>
                            <Input placeholder="https://..." value={form.website}
                                onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Notas</Label>
                            <Textarea placeholder="Comentarios adicionales..." value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#0034a1] hover:bg-[#0034a1]/90">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editing ? "Guardar Cambios" : "Crear Proveedor"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
