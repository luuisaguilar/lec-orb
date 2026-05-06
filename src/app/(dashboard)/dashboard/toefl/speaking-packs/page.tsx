"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Package,
    Search,
    Plus,
    ScanBarcode,
    FileSpreadsheet,
    Download,
    MapPin,
    ArrowRightLeft,
    MoreHorizontal,
    Trash2,
    RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddPackDialog } from "@/components/inventory/add-pack-dialog";
import { ScanDialog } from "@/components/inventory/scan-dialog";
import { ExcelImportDialog } from "@/components/inventory/excel-import-dialog";
import { exportPacksToExcel } from "@/lib/inventory/excel-export";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Pack {
    id: string;
    codigo: string;
    nombre: string | null;
    status: "EN_SITIO" | "PRESTADO";
    notes: string | null;
    created_at: string;
    updated_at: string;
    fecha: string | null;
    hora_salida: string | null;
    hora_entrada: string | null;
    school_id: string | null;
    applicator_id: string | null;
    // nested from join
    school?: { id: string; name: string } | null;
    applicator?: { id: string; name: string } | null;
}

export default function SpeakingPacksPage() {
    const { t } = useI18n();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showAddPack, setShowAddPack] = useState(false);
    const [showScan, setShowScan] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [scannedCode, setScannedCode] = useState("");

    const queryParams = new URLSearchParams();
    if (search) queryParams.set("search", search);
    if (statusFilter) queryParams.set("status", statusFilter);

    const { data, isLoading, mutate } = useSWR(
        `/api/v1/packs?${queryParams.toString()}`,
        fetcher,
        { refreshInterval: 15000 }
    );

    const packs: Pack[] = data?.packs || [];
    const total = data?.total || 0;

    const onSiteCount = packs.filter((p) => p.status === "EN_SITIO").length;
    const loanedCount = packs.filter((p) => p.status === "PRESTADO").length;

    const handlePackCreated = useCallback(() => {
        mutate();
        setShowAddPack(false);
        setScannedCode("");
    }, [mutate]);

    const handleScanComplete = useCallback(() => {
        mutate();
    }, [mutate]);

    const handleImportComplete = useCallback(() => {
        mutate();
        setShowImport(false);
    }, [mutate]);

    const handleAddPackFromScan = useCallback((code: string) => {
        setShowScan(false);
        setScannedCode(code);
        setTimeout(() => setShowAddPack(true), 150);
    }, []);

    async function handleToggleStatus(pack: Pack) {
        const newStatus = pack.status === "EN_SITIO" ? "PRESTADO" : "EN_SITIO";
        try {
            const res = await fetch(`/api/v1/packs/${pack.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                toast.success(`Estatus actualizado a ${newStatus === "EN_SITIO" ? "En Sitio" : "Prestado"}`);
                mutate();
            } else {
                const err = await res.json();
                toast.error(err.error || "Error al actualizar estatus");
            }
        } catch {
            toast.error("Error al actualizar estatus");
        }
    }

    async function handleDelete(pack: Pack) {
        if (!confirm(`¿Eliminar el pack "${pack.codigo}"? Esta acción no se puede deshacer.`)) return;
        try {
            const res = await fetch(`/api/v1/packs/${pack.id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Pack eliminado correctamente");
                mutate();
            } else {
                const err = await res.json();
                toast.error(err.error || "Error al eliminar pack");
            }
        } catch {
            toast.error("Error al eliminar pack");
        }
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">
            {/* Header - Vibrant Light Style */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                        {t("inventory.title")} <span className="text-blue-600">Inventory</span>
                    </h2>
                    <p className="text-slate-500 font-medium">Gestión de Speaking Packs y materiales de examen.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => setShowScan(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
                    >
                        <ScanBarcode className="mr-2 h-4 w-4" />
                        {t("inventory.scanBarcode")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddPack(true)} className="border-blue-200 hover:bg-blue-50 text-blue-700">
                        <Plus className="mr-2 h-4 w-4" />
                        {t("inventory.addPack")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowImport(true)} className="border-slate-200 hover:bg-slate-50">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        {t("excel.import")}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => exportPacksToExcel(packs, t)}
                        className="text-slate-600 hover:bg-slate-100"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        {t("excel.export")}
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Solid White / Vibrant Accents */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white border-2 border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("inventory.totalPacks")}</p>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Package className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="text-4xl font-black text-slate-900">{total}</div>
                        <p className="text-xs text-slate-400 mt-1">Registrados en sistema</p>
                    </div>
                </Card>
                <Card className="bg-white border-2 border-slate-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500">
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("inventory.onSiteCount")}</p>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <MapPin className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="text-4xl font-black text-emerald-600">{onSiteCount}</div>
                        <p className="text-xs text-slate-400 mt-1">Disponibles para uso</p>
                    </div>
                </Card>
                <Card className="bg-white border-2 border-slate-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-500">
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("inventory.loanedCount")}</p>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <ArrowRightLeft className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="text-4xl font-black text-amber-600">{loanedCount}</div>
                        <p className="text-xs text-slate-400 mt-1">En evaluación externa</p>
                    </div>
                </Card>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-3 sm:flex-row bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder={t("common.search")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all bg-slate-50/30"
                    />
                </div>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <Button
                        variant={statusFilter === "" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setStatusFilter("")}
                        className={cn(
                            "rounded-md px-4 transition-all h-8 text-xs font-bold",
                            statusFilter === "" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        {t("inventory.allStatuses")}
                    </Button>
                    <Button
                        variant={statusFilter === "EN_SITIO" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setStatusFilter("EN_SITIO")}
                        className={cn(
                            "rounded-md px-4 transition-all h-8 text-xs font-bold",
                            statusFilter === "EN_SITIO" ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600" : "text-slate-500 hover:text-emerald-600"
                        )}
                    >
                        <MapPin className="mr-1.5 h-3.5 w-3.5" />
                        En Sitio
                    </Button>
                    <Button
                        variant={statusFilter === "PRESTADO" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setStatusFilter("PRESTADO")}
                        className={cn(
                            "rounded-md px-4 transition-all h-8 text-xs font-bold",
                            statusFilter === "PRESTADO" ? "bg-amber-500 text-white shadow-sm hover:bg-amber-600" : "text-slate-500 hover:text-amber-600"
                        )}
                    >
                        <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                        Prestado
                    </Button>
                </div>
            </div>

            {/* Inventory Table - Clean & High Contrast */}
            <Card className="border-2 border-slate-100 overflow-hidden shadow-md">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b-2 border-slate-100">
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">ID</th>
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">Código</th>
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">Speaking Pack Test</th>
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">Aplicación / Colegio</th>
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">Estatus</th>
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">Fecha de Registro</th>
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">Aplicador</th>
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">Salida</th>
                                    <th className="px-4 py-4 text-left font-bold text-xs text-slate-500 uppercase tracking-widest">Entrada</th>
                                    <th className="px-4 py-4 text-right font-bold text-xs text-slate-500 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-slate-500 font-medium">{t("common.loading")}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : packs.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-20 text-center text-slate-400 font-medium">
                                            {t("common.noResults")}
                                        </td>
                                    </tr>
                                ) : (
                                    packs.map((pack) => (
                                        <tr
                                            key={pack.id}
                                            className="border-b border-slate-50 transition-colors hover:bg-blue-50/30 group"
                                        >
                                            <td className="px-4 py-4 text-[10px] text-slate-400 font-mono">
                                                {pack.id.slice(0, 6)}
                                            </td>
                                            <td className="px-4 py-4 font-mono font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                                {pack.codigo}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-slate-900">
                                                {pack.nombre || "—"}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600">
                                                {pack.school?.name || "—"}
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge
                                                    className={cn(
                                                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border-none shadow-sm",
                                                        pack.status === "EN_SITIO"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : "bg-amber-100 text-amber-800"
                                                    )}
                                                >
                                                    {pack.status === "EN_SITIO" ? "En Sitio" : "Prestado"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-slate-500 text-xs font-medium">
                                                {pack.created_at
                                                    ? new Date(pack.created_at).toLocaleDateString("es-MX", { day: '2-digit', month: 'short' })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 font-medium">
                                                {pack.applicator?.name || "—"}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-xs text-amber-600 font-bold">
                                                {pack.hora_salida || "—"}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-xs text-emerald-600 font-bold">
                                                {pack.hora_entrada || "—"}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 border-2 border-slate-100 shadow-xl">
                                                        <DropdownMenuLabel className="text-xs uppercase text-slate-400 font-black">Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(pack)}
                                                            className="cursor-pointer font-bold focus:bg-blue-50 focus:text-blue-700"
                                                        >
                                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                                            Marcar como {pack.status === "EN_SITIO" ? "Prestado" : "En Sitio"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:bg-red-50 focus:text-red-700 font-bold cursor-pointer"
                                                            onClick={() => handleDelete(pack)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Eliminar pack
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <AddPackDialog
                open={showAddPack}
                onOpenChange={(open) => {
                    setShowAddPack(open);
                    if (!open) setScannedCode("");
                }}
                onSuccess={handlePackCreated}
                initialCode={scannedCode}
            />
            <ScanDialog
                open={showScan}
                onOpenChange={setShowScan}
                onMovement={handleScanComplete}
                onAddPack={handleAddPackFromScan}
            />
            <ExcelImportDialog
                open={showImport}
                onOpenChange={setShowImport}
                onSuccess={handleImportComplete}
            />
        </div>
    );
}
