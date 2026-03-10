"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import {
    BookOpen, Plus, Pencil, Trash2, DollarSign, Tag, Loader2
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
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then(r => r.json());

import { useMemo } from "react";
import { Search, Filter, X } from "lucide-react";

interface PaymentConcept {
    id: string;
    concept_key: string;
    description: string;
    cost: number;
    currency: string;
    expiration_date: string | null;
    is_active: boolean;
}

const EMPTY_FORM = { description: "", concept_key: "", cost: "", currency: "MXN", expiration_date: "" };

export default function CatalogPage() {
    const { data, isLoading, mutate } = useSWR("/api/v1/payments/catalog", fetcher);
    const [showDialog, setShowDialog] = useState(false);
    const [editing, setEditing] = useState<PaymentConcept | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    
    // Search and Filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);

    const concepts: PaymentConcept[] = data?.concepts || [];

    const filteredConcepts = useMemo(() => {
        return concepts.filter(c => {
            const matchesSearch = 
                c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.concept_key.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCurrency = !currencyFilter || c.currency === currencyFilter;
            return matchesSearch && matchesCurrency;
        });
    }, [concepts, searchTerm, currencyFilter]);

    const currencies = useMemo(() => {
        const set = new Set(concepts.map(c => c.currency));
        return Array.from(set);
    }, [concepts]);

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setShowDialog(true);
    };

    const openEdit = (c: PaymentConcept) => {
        setEditing(c);
        setForm({
            description: c.description,
            concept_key: c.concept_key,
            cost: String(c.cost),
            currency: c.currency,
            expiration_date: c.expiration_date?.slice(0, 10) ?? "",
        });
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!form.description || !form.concept_key || !form.cost) {
            toast.error("Completa los campos obligatorios");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                description: form.description,
                concept_key: form.concept_key.toUpperCase().replace(/\s+/g, "_"),
                cost: parseFloat(form.cost),
                currency: form.currency || "MXN",
                expiration_date: form.expiration_date || null,
            };
            const url = editing ? `/api/v1/payments/catalog/${editing.id}` : "/api/v1/payments/catalog";
            const method = editing ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Error al guardar");
            toast.success(editing ? "Concepto actualizado" : "Concepto creado");
            setShowDialog(false);
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Desactivar "${name}"? Ya no aparecerá en cotizaciones.`)) return;
        try {
            const res = await fetch(`/api/v1/payments/catalog/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Concepto desactivado");
            mutate();
        } catch {
            toast.error("Error al desactivar");
        }
    };

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#0034a1]">Catálogo de Exámenes</h2>
                    <p className="text-muted-foreground font-medium">
                        Gestiona los nombres, códigos y precios vigentes de todos los exámenes.
                    </p>
                </div>
                <Button onClick={openCreate} className="bg-[#0034a1] hover:bg-[#0034a1]/90">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Concepto
                </Button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por nombre o código..." 
                        className="pl-10" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {currencies.length > 1 && (
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <div className="flex gap-1">
                            {currencies.map(curr => (
                                <Badge 
                                    key={curr}
                                    variant={currencyFilter === curr ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => setCurrencyFilter(currencyFilter === curr ? null : curr)}
                                >
                                    {curr}
                                </Badge>
                            ))}
                            {currencyFilter && (
                                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setCurrencyFilter(null)}>
                                    <X className="h-3 w-3 mr-1" /> Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Card className="shadow-sm border-t-4 border-t-[#0034a1]">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                        <div className="flex items-center">
                            <BookOpen className="mr-2 h-5 w-5 text-[#0034a1]" />
                            {filteredConcepts.length} {filteredConcepts.length === 1 ? 'concepto' : 'conceptos'} {searchTerm || currencyFilter ? 'filtrados' : 'activos'}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-24 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredConcepts.length === 0 ? (
                        <div className="flex h-32 flex-col items-center justify-center space-y-2 text-center">
                            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">
                                {searchTerm || currencyFilter ? 'No hay resultados para los filtros aplicados.' : 'No hay conceptos registrados.'}
                            </p>
                            {(searchTerm || currencyFilter) && (
                                <Button variant="link" onClick={() => { setSearchTerm(""); setCurrencyFilter(null); }}>
                                    Limpiar búsqueda
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Examen / Descripción</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead className="text-right">Precio</TableHead>
                                        <TableHead>Vencimiento</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredConcepts.map((c) => (
                                        <TableRow key={c.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">{c.description}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    <Tag className="mr-1 h-3 w-3" />{c.concept_key}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-emerald-700 dark:text-emerald-400">
                                                <span className="flex items-center justify-end gap-1">
                                                    <DollarSign className="h-3.5 w-3.5" />
                                                    {Number(c.cost).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                                    <span className="text-xs text-muted-foreground ml-1">{c.currency}</span>
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {c.expiration_date
                                                    ? format(new Date(c.expiration_date + "T12:00:00"), "dd/MM/yyyy")
                                                    : <span className="italic opacity-50">Sin fecha</span>
                                                }
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(c.id, c.description)}>
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar Concepto" : "Nuevo Concepto de Examen"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Nombre / Descripción *</Label>
                            <Input placeholder="Ej: KET for Schools" value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Código (concept_key) *</Label>
                            <Input placeholder="Ej: KET_FS" value={form.concept_key}
                                onChange={e => setForm(f => ({ ...f, concept_key: e.target.value.toUpperCase() }))} className="font-mono" />
                            <p className="text-xs text-muted-foreground">Solo mayúsculas, números y guiones bajos.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Precio *</Label>
                                <Input type="number" placeholder="3990" value={form.cost}
                                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Moneda</Label>
                                <Input placeholder="MXN" maxLength={3} value={form.currency}
                                    onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} className="font-mono" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Vencimiento del precio</Label>
                            <Input type="date" value={form.expiration_date}
                                onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#0034a1] hover:bg-[#0034a1]/90">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editing ? "Guardar Cambios" : "Crear Concepto"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
