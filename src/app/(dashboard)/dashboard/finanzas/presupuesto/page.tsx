"use client";

import { useState, useCallback, useEffect } from "react";
import {
    ChevronLeft, ChevronRight, Save, Plus, Trash2,
    PieChart, LayoutGrid, Columns3, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type Source = "CAJA_CHICA" | "CUENTA_BAC";

interface PoaLine {
    id?:              string;
    org_id?:          string;
    year:             number;
    month:            number;
    source:           Source;
    section:          string;
    concept:          string;
    budgeted_amount:  number;
    real_amount:      number | null;
    notes?:           string | null;
    sort_order:       number;
}

// Grouped structure: section → concept → month(1-12) → PoaLine
type Grouped = Record<string, Record<string, Record<number, PoaLine>>>;

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const fmt = (n: number | null | undefined) =>
    n == null ? "—" : new Intl.NumberFormat("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtInput = (n: number | null | undefined) =>
    n == null || n === 0 ? "" : String(n);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PresupuestoPage() {
    const [year,   setYear]   = useState(new Date().getFullYear());
    const [source, setSource] = useState<Source>("CAJA_CHICA");
    const [view,   setView]   = useState<"annual" | "monthly">("annual");
    const [month,  setMonth]  = useState(new Date().getMonth() + 1); // 1-12

    const [lines,   setLines]   = useState<PoaLine[]>([]);
    const [grouped, setGrouped] = useState<Grouped>({});
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);

    // Local edits: key = `${section}||${concept}||${month}` → { budgeted, real }
    const [edits, setEdits] = useState<Record<string, { budgeted: string; real: string }>>({});

    /** POA libre vs catálogo presupuestal V2 (caja chica). */
    const [workspace, setWorkspace] = useState<"poa" | "partidas">("poa");

    // New concept / section form
    const [newConcept, setNewConcept] = useState("");
    const [addingTo,   setAddingTo]   = useState<string | null>(null); // section name being added to
    const [newSectionName, setNewSectionName] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/finance/poa?year=${year}&source=${source}`);
            if (!res.ok) throw new Error("Error al cargar presupuesto");
            const { lines: data, grouped: g } = await res.json();
            setLines(data);
            setGrouped(g ?? {});
            // Seed edits from existing data
            const initial: Record<string, { budgeted: string; real: string }> = {};
            for (const line of data as PoaLine[]) {
                const key = `${line.section}||${line.concept}||${line.month}`;
                initial[key] = {
                    budgeted: fmtInput(line.budgeted_amount),
                    real:     fmtInput(line.real_amount),
                };
            }
            setEdits(initial);
        } catch {
            toast.error("Error al cargar datos del presupuesto");
        } finally {
            setLoading(false);
        }
    }, [year, source]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const getEdit = (section: string, concept: string, m: number) =>
        edits[`${section}||${concept}||${m}`] ?? { budgeted: "", real: "" };

    const setEdit = (section: string, concept: string, m: number, field: "budgeted" | "real", value: string) => {
        const key = `${section}||${concept}||${m}`;
        setEdits(prev => ({ ...prev, [key]: { ...prev[key] ?? { budgeted: "", real: "" }, [field]: value } }));
    };

    const totalBudgeted = (section: string, concept: string) =>
        MONTHS.reduce((acc, _, i) => acc + (parseFloat(getEdit(section, concept, i + 1).budgeted) || 0), 0);

    const totalReal = (section: string, concept: string) =>
        MONTHS.reduce((acc, _, i) => acc + (parseFloat(getEdit(section, concept, i + 1).real) || 0), 0);

    const sectionTotalBudgeted = (section: string) =>
        Object.keys(grouped[section] ?? {}).reduce((a, c) => a + totalBudgeted(section, c), 0);

    const sectionTotalReal = (section: string) =>
        Object.keys(grouped[section] ?? {}).reduce((a, c) => a + totalReal(section, c), 0);

    // ── Sections & Concepts (all from grouped + any newly added) ────────────
    const [localSections, setLocalSections] = useState<Record<string, string[]>>({});

    // Merge grouped keys with local additions
    const allSections = Array.from(new Set([
        ...Object.keys(grouped),
        ...Object.keys(localSections),
    ]));

    const conceptsOf = (section: string) => Array.from(new Set([
        ...Object.keys(grouped[section] ?? {}),
        ...(localSections[section] ?? []),
    ]));

    // ── Save ─────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: Omit<PoaLine, "id" | "org_id">[] = [];

            for (const section of allSections) {
                for (const concept of conceptsOf(section)) {
                    for (let m = 1; m <= 12; m++) {
                        const e = getEdit(section, concept, m);
                        const budgeted = parseFloat(e.budgeted) || 0;
                        const real     = e.real !== "" ? parseFloat(e.real) : null;
                        // Only send if there's something to save
                        if (budgeted > 0 || real != null) {
                            payload.push({
                                year,
                                month:            m,
                                source,
                                section,
                                concept,
                                budgeted_amount:  budgeted,
                                real_amount:      real,
                                sort_order:       0,
                            });
                        }
                    }
                }
            }

            if (payload.length === 0) {
                toast.info("No hay cambios con montos para guardar");
                return;
            }

            const res = await fetch("/api/v1/finance/poa", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Error al guardar");
            }

            toast.success(`${payload.length} líneas guardadas`);
            setLocalSections({});
            loadData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    // ── Add concept ───────────────────────────────────────────────────────────

    const addConcept = (section: string) => {
        const trimmed = newConcept.trim();
        if (!trimmed) return;
        if (conceptsOf(section).includes(trimmed)) {
            toast.error("Ese concepto ya existe en esta sección");
            return;
        }
        setLocalSections(prev => ({
            ...prev,
            [section]: [...(prev[section] ?? []), trimmed],
        }));
        setNewConcept("");
        setAddingTo(null);
    };

    const addSection = () => {
        const trimmed = newSectionName.trim();
        if (!trimmed) return;
        if (allSections.includes(trimmed)) {
            toast.error("Esa sección ya existe");
            return;
        }
        setLocalSections(prev => ({ ...prev, [trimmed]: [] }));
        setNewSectionName("");
    };

    // ── Delete concept (only local unsaved ones) ─────────────────────────────

    const deleteLocalConcept = (section: string, concept: string) => {
        setLocalSections(prev => ({
            ...prev,
            [section]: (prev[section] ?? []).filter(c => c !== concept),
        }));
        // Clear edits
        setEdits(prev => {
            const next = { ...prev };
            for (let m = 1; m <= 12; m++) delete next[`${section}||${concept}||${m}`];
            return next;
        });
    };

    const deleteSavedConcept = async (section: string, concept: string) => {
        const toDelete = lines.filter(l => l.section === section && l.concept === concept && l.id);
        for (const l of toDelete) {
            await fetch(`/api/v1/finance/poa/${l.id}`, { method: "DELETE" });
        }
        // Clear local edits
        setEdits(prev => {
            const next = { ...prev };
            for (let m = 1; m <= 12; m++) delete next[`${section}||${concept}||${m}`];
            return next;
        });
        loadData();
    };

    // ─── Concentrado helpers (sum CAJA_CHICA + CUENTA_BAC) ────────────────────
    // (computed client-side from current edits of both sources)
    // Not implemented in this view — available as separate tab (read-only)

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <PieChart className="h-7 w-7 text-primary" />
                        Presupuesto POA
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Plan Operativo Anual — conceptos libres por fuente de fondos
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Year selector */}
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setYear(y => y - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-bold px-3 min-w-[60px] text-center">{year}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setYear(y => y + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* View toggle */}
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                        <Button
                            variant={view === "annual" ? "secondary" : "ghost"}
                            size="sm" className="h-8 gap-1.5"
                            onClick={() => setView("annual")}>
                            <Columns3 className="h-3.5 w-3.5" /> Anual
                        </Button>
                        <Button
                            variant={view === "monthly" ? "secondary" : "ghost"}
                            size="sm" className="h-8 gap-1.5"
                            onClick={() => setView("monthly")}>
                            <LayoutGrid className="h-3.5 w-3.5" /> Mensual
                        </Button>
                    </div>

                    {/* Month picker (monthly view only) */}
                    {view === "monthly" && (
                        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                            <SelectTrigger className="w-[110px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((m, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {workspace === "poa" && (
                        <Button onClick={handleSave} disabled={saving} size="sm" className="h-9">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                            Guardar
                        </Button>
                    )}
                </div>
            </div>

            <Tabs value={workspace} onValueChange={(v) => setWorkspace(v as "poa" | "partidas")}>
                <TabsList className="mb-2">
                    <TabsTrigger value="poa">POA operativo</TabsTrigger>
                    <TabsTrigger value="partidas">Partidas presupuestales</TabsTrigger>
                </TabsList>

                <TabsContent value="partidas" className="mt-0">
                    <BudgetPartidasPanel year={year} />
                </TabsContent>

                <TabsContent value="poa" className="mt-0 space-y-6">
            {/* ── Source tabs ── */}
            <Tabs value={source} onValueChange={v => setSource(v as Source)}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="CAJA_CHICA">Caja Chica</TabsTrigger>
                        <TabsTrigger value="CUENTA_BAC">Cuenta BAC</TabsTrigger>
                    </TabsList>

                    {/* Add section */}
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Nueva sección..."
                            className="h-8 w-44 text-sm"
                            value={newSectionName}
                            onChange={e => setNewSectionName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") addSection(); }}
                        />
                        <Button variant="outline" size="sm" className="h-8" onClick={addSection}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Sección
                        </Button>
                    </div>
                </div>

                {(["CAJA_CHICA", "CUENTA_BAC"] as Source[]).map(src => (
                    <TabsContent key={src} value={src} className="mt-4 space-y-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
                            </div>
                        ) : allSections.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    <PieChart className="h-8 w-8 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Sin líneas de presupuesto</p>
                                    <p className="text-sm mt-1">Agrega una sección y conceptos para comenzar.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            allSections.map(section => (
                                <SectionBlock
                                    key={section}
                                    section={section}
                                    concepts={conceptsOf(section)}
                                    view={view}
                                    month={month}
                                    lines={lines}
                                    getEdit={getEdit}
                                    setEdit={setEdit}
                                    totalBudgeted={totalBudgeted}
                                    totalReal={totalReal}
                                    sectionTotalBudgeted={sectionTotalBudgeted}
                                    sectionTotalReal={sectionTotalReal}
                                    addingTo={addingTo}
                                    setAddingTo={setAddingTo}
                                    newConcept={newConcept}
                                    setNewConcept={setNewConcept}
                                    addConcept={addConcept}
                                    deleteLocalConcept={deleteLocalConcept}
                                    deleteSavedConcept={deleteSavedConcept}
                                    localConcepts={localSections[section] ?? []}
                                />
                            ))
                        )}
                    </TabsContent>
                ))}
            </Tabs>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function BudgetPartidasPanel({ year }: { year: number }) {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<
        Array<{
            id: string;
            name: string;
            items: Array<{
                id: string;
                code: string;
                name: string;
                lines: Array<{
                    id: string;
                    month: number;
                    channel: string;
                    budgeted_amount: number;
                    actual_amount: number;
                }>;
            }>;
        }>
    >([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/v1/finance/budget-catalog?fiscal_year=${year}`);
                if (!res.ok) throw new Error("budget-catalog");
                const body = await res.json();
                if (!cancelled) setCategories(body.categories ?? []);
            } catch {
                if (!cancelled) setCategories([]);
                toast.error("No se pudo cargar el catálogo presupuestal");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [year]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando catálogo…
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    <p className="font-medium">Sin partidas presupuestales</p>
                    <p className="text-sm mt-1">Aplica la migración de seed V2 o revisa permisos de finanzas.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Catálogo {year}</CardTitle>
                    <CardDescription>
                        Categorías, partidas y ejecución mensual (canal no fiscal) usadas por Caja Chica V2.
                    </CardDescription>
                </CardHeader>
            </Card>
            {categories.map((cat) => (
                <Card key={cat.id}>
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">{cat.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {cat.items.map((item) => (
                            <div key={item.id} className="border rounded-md overflow-hidden">
                                <div className="bg-muted/40 px-3 py-2 text-sm font-medium">
                                    <span className="font-mono text-xs mr-2">{item.code}</span>
                                    {item.name}
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs">
                                            <TableHead className="w-20">Mes</TableHead>
                                            <TableHead className="text-right">Pto.</TableHead>
                                            <TableHead className="text-right">Real</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {item.lines
                                            .filter((l) => l.channel === "non_fiscal")
                                            .sort((a, b) => a.month - b.month)
                                            .map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell className="text-sm">{MONTHS[line.month - 1]}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm">
                                                        {fmt(line.budgeted_amount)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm">
                                                        {fmt(line.actual_amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ─── Section Block ────────────────────────────────────────────────────────────

interface SectionBlockProps {
    section:              string;
    concepts:             string[];
    view:                 "annual" | "monthly";
    month:                number;
    lines:                PoaLine[];
    getEdit:              (s: string, c: string, m: number) => { budgeted: string; real: string };
    setEdit:              (s: string, c: string, m: number, f: "budgeted" | "real", v: string) => void;
    totalBudgeted:        (s: string, c: string) => number;
    totalReal:            (s: string, c: string) => number;
    sectionTotalBudgeted: (s: string) => number;
    sectionTotalReal:     (s: string) => number;
    addingTo:             string | null;
    setAddingTo:          (v: string | null) => void;
    newConcept:           string;
    setNewConcept:        (v: string) => void;
    addConcept:           (s: string) => void;
    deleteLocalConcept:   (s: string, c: string) => void;
    deleteSavedConcept:   (s: string, c: string) => Promise<void>;
    localConcepts:        string[];
}

function SectionBlock({
    section, concepts, view, month, lines,
    getEdit, setEdit,
    totalBudgeted, totalReal,
    sectionTotalBudgeted, sectionTotalReal,
    addingTo, setAddingTo, newConcept, setNewConcept, addConcept,
    deleteLocalConcept, deleteSavedConcept, localConcepts,
}: SectionBlockProps) {
    const isLocal = (concept: string) => localConcepts.includes(concept);
    const isSaved = (concept: string) => lines.some(l => l.section === section && l.concept === concept);

    return (
        <Card>
            <CardHeader className="py-3 px-4 bg-muted/40 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {section}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Pto: <span className="font-semibold text-foreground">${fmt(sectionTotalBudgeted(section))}</span></span>
                        <span>Real: <span className="font-semibold text-foreground">${fmt(sectionTotalReal(section))}</span></span>
                        <VariationBadge pto={sectionTotalBudgeted(section)} real={sectionTotalReal(section)} />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {view === "annual" ? (
                    <AnnualTable
                        section={section}
                        concepts={concepts}
                        getEdit={getEdit}
                        setEdit={setEdit}
                        totalBudgeted={totalBudgeted}
                        totalReal={totalReal}
                        isLocal={isLocal}
                        isSaved={isSaved}
                        deleteLocalConcept={deleteLocalConcept}
                        deleteSavedConcept={deleteSavedConcept}
                    />
                ) : (
                    <MonthlyTable
                        section={section}
                        concepts={concepts}
                        month={month}
                        getEdit={getEdit}
                        setEdit={setEdit}
                        isLocal={isLocal}
                        isSaved={isSaved}
                        deleteLocalConcept={deleteLocalConcept}
                        deleteSavedConcept={deleteSavedConcept}
                    />
                )}

                {/* Add concept row */}
                <div className="border-t px-4 py-2">
                    {addingTo === section ? (
                        <div className="flex items-center gap-2">
                            <Input
                                autoFocus
                                placeholder="Nombre del concepto..."
                                className="h-7 text-sm flex-1"
                                value={newConcept}
                                onChange={e => setNewConcept(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") addConcept(section);
                                    if (e.key === "Escape") { setAddingTo(null); setNewConcept(""); }
                                }}
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={() => addConcept(section)}>
                                Agregar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                                onClick={() => { setAddingTo(null); setNewConcept(""); }}>
                                Cancelar
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setAddingTo(section)}>
                            <Plus className="h-3 w-3 mr-1" /> Agregar concepto
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Annual Table ─────────────────────────────────────────────────────────────

interface TableProps {
    section:            string;
    concepts:           string[];
    getEdit:            (s: string, c: string, m: number) => { budgeted: string; real: string };
    setEdit:            (s: string, c: string, m: number, f: "budgeted" | "real", v: string) => void;
    totalBudgeted:      (s: string, c: string) => number;
    totalReal:          (s: string, c: string) => number;
    isLocal:            (c: string) => boolean;
    isSaved:            (c: string) => boolean;
    deleteLocalConcept: (s: string, c: string) => void;
    deleteSavedConcept: (s: string, c: string) => Promise<void>;
}

function AnnualTable({
    section, concepts, getEdit, setEdit,
    totalBudgeted, totalReal,
    isLocal, isSaved, deleteLocalConcept, deleteSavedConcept,
}: TableProps) {
    if (concepts.length === 0) {
        return (
            <p className="text-xs text-muted-foreground px-4 py-3">
                Sin conceptos. Usa <span className="font-medium">+ Agregar concepto</span> para comenzar.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="text-xs bg-muted/20">
                        <TableHead className="w-[200px] sticky left-0 bg-background z-10">Concepto</TableHead>
                        {MONTHS.map(m => (
                            <TableHead key={m} className="text-center min-w-[110px] px-1">
                                <div>{m}</div>
                                <div className="flex gap-1 text-[10px] font-normal text-muted-foreground justify-center">
                                    <span className="w-[48px] text-center">Pto</span>
                                    <span className="w-[48px] text-center">Real</span>
                                </div>
                            </TableHead>
                        ))}
                        <TableHead className="text-center min-w-[120px]">Total</TableHead>
                        <TableHead className="w-[40px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {concepts.map(concept => (
                        <TableRow key={concept} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-sm sticky left-0 bg-background z-10 py-1">
                                {concept}
                                {isLocal(concept) && !isSaved(concept) && (
                                    <span className="ml-2 text-[10px] text-amber-500 font-normal">nuevo</span>
                                )}
                            </TableCell>
                            {MONTHS.map((_, i) => {
                                const m = i + 1;
                                const e = getEdit(section, concept, m);
                                return (
                                    <TableCell key={m} className="px-1 py-1">
                                        <div className="flex gap-1">
                                            <AmountInput
                                                value={e.budgeted}
                                                onChange={v => setEdit(section, concept, m, "budgeted", v)}
                                                placeholder="0"
                                                className="w-[48px] text-xs h-7"
                                            />
                                            <AmountInput
                                                value={e.real}
                                                onChange={v => setEdit(section, concept, m, "real", v)}
                                                placeholder="—"
                                                className="w-[48px] text-xs h-7 text-muted-foreground"
                                            />
                                        </div>
                                    </TableCell>
                                );
                            })}
                            <TableCell className="text-center py-1">
                                <div className="text-xs space-y-0.5">
                                    <div className="font-semibold">${fmt(totalBudgeted(section, concept))}</div>
                                    <div className="text-muted-foreground">${fmt(totalReal(section, concept))}</div>
                                    <VariationBadge pto={totalBudgeted(section, concept)} real={totalReal(section, concept)} small />
                                </div>
                            </TableCell>
                            <TableCell className="py-1 pr-2">
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => isLocal(concept) && !isSaved(concept)
                                        ? deleteLocalConcept(section, concept)
                                        : deleteSavedConcept(section, concept)
                                    }
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// ─── Monthly Table ────────────────────────────────────────────────────────────

interface MonthlyTableProps {
    section:            string;
    concepts:           string[];
    month:              number;
    getEdit:            (s: string, c: string, m: number) => { budgeted: string; real: string };
    setEdit:            (s: string, c: string, m: number, f: "budgeted" | "real", v: string) => void;
    isLocal:            (c: string) => boolean;
    isSaved:            (c: string) => boolean;
    deleteLocalConcept: (s: string, c: string) => void;
    deleteSavedConcept: (s: string, c: string) => Promise<void>;
}

function MonthlyTable({
    section, concepts, month,
    getEdit, setEdit,
    isLocal, isSaved, deleteLocalConcept, deleteSavedConcept,
}: MonthlyTableProps) {
    if (concepts.length === 0) {
        return (
            <p className="text-xs text-muted-foreground px-4 py-3">
                Sin conceptos. Usa <span className="font-medium">+ Agregar concepto</span> para comenzar.
            </p>
        );
    }

    const rows = concepts.map(concept => {
        const e       = getEdit(section, concept, month);
        const pto     = parseFloat(e.budgeted) || 0;
        const real    = e.real !== "" ? parseFloat(e.real) : null;
        const diff    = real != null ? pto - real : null;
        const pct     = pto > 0 && real != null ? ((pto - real) / pto) * 100 : null;
        return { concept, pto, real, diff, pct, e };
    });

    const totalPto  = rows.reduce((a, r) => a + r.pto,  0);
    const totalReal = rows.reduce((a, r) => a + (r.real ?? 0), 0);

    return (
        <Table>
            <TableHeader>
                <TableRow className="text-xs bg-muted/20">
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right w-[130px]">Presupuestado</TableHead>
                    <TableHead className="text-right w-[130px]">Real</TableHead>
                    <TableHead className="text-right w-[110px]">Variación</TableHead>
                    <TableHead className="text-right w-[70px]">%</TableHead>
                    <TableHead className="w-[40px]" />
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map(({ concept, diff, pct, e }) => (
                    <TableRow key={concept} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm py-1.5">
                            {concept}
                            {isLocal(concept) && !isSaved(concept) && (
                                <span className="ml-2 text-[10px] text-amber-500 font-normal">nuevo</span>
                            )}
                        </TableCell>
                        <TableCell className="py-1.5">
                            <AmountInput
                                value={e.budgeted}
                                onChange={v => setEdit(section, concept, month, "budgeted", v)}
                                placeholder="0"
                                className="w-full text-sm h-8 text-right"
                            />
                        </TableCell>
                        <TableCell className="py-1.5">
                            <AmountInput
                                value={e.real}
                                onChange={v => setEdit(section, concept, month, "real", v)}
                                placeholder="—"
                                className="w-full text-sm h-8 text-right"
                            />
                        </TableCell>
                        <TableCell className={cn(
                            "text-right font-mono text-sm py-1.5",
                            diff == null ? "text-muted-foreground" :
                            diff < 0     ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"
                        )}>
                            {diff == null ? "—" : `${diff >= 0 ? "+" : ""}$${fmt(diff)}`}
                        </TableCell>
                        <TableCell className="text-right py-1.5">
                            {pct != null ? (
                                <Badge variant="outline" className={cn(
                                    "text-xs",
                                    pct < 0
                                        ? "border-rose-200 text-rose-600 bg-rose-50"
                                        : "border-emerald-200 text-emerald-700 bg-emerald-50"
                                )}>
                                    {pct.toFixed(1)}%
                                </Badge>
                            ) : "—"}
                        </TableCell>
                        <TableCell className="py-1.5 pr-2">
                            <Button
                                variant="ghost" size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => isLocal(concept) && !isSaved(concept)
                                    ? deleteLocalConcept(section, concept)
                                    : deleteSavedConcept(section, concept)
                                }
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            {/* Totals row */}
            <tfoot>
                <tr className="border-t bg-muted/30 font-semibold text-sm">
                    <td className="px-4 py-2">Total</td>
                    <td className="text-right px-4 py-2 font-mono">${fmt(totalPto)}</td>
                    <td className="text-right px-4 py-2 font-mono">${fmt(totalReal)}</td>
                    <td className="text-right px-4 py-2 font-mono">
                        <span className={cn(
                            totalPto - totalReal >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {totalPto - totalReal >= 0 ? "+" : ""}${fmt(totalPto - totalReal)}
                        </span>
                    </td>
                    <td colSpan={2} />
                </tr>
            </tfoot>
        </Table>
    );
}

// ─── Amount Input ─────────────────────────────────────────────────────────────

function AmountInput({
    value, onChange, placeholder, className,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
}) {
    return (
        <Input
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn("px-1.5", className)}
        />
    );
}

// ─── Variation Badge ──────────────────────────────────────────────────────────

function VariationBadge({ pto, real, small }: { pto: number; real: number; small?: boolean }) {
    if (real === 0) return null;
    const diff = pto - real;
    const pct  = pto > 0 ? (diff / pto) * 100 : 0;
    const pos  = diff >= 0;
    return (
        <Badge
            variant="outline"
            className={cn(
                small ? "text-[10px] px-1 py-0" : "text-xs",
                pos
                    ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                    : "border-rose-200 text-rose-600 bg-rose-50"
            )}
        >
            {pos ? "+" : ""}{pct.toFixed(1)}%
        </Badge>
    );
}
