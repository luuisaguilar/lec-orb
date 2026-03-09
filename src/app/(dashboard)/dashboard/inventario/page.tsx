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

export default function InventoryPage() {
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {t("inventory.title")}
                    </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => setShowScan(true)}
                        className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                    >
                        <ScanBarcode className="mr-2 h-4 w-4" />
                        {t("inventory.scanBarcode")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddPack(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("inventory.addPack")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowImport(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        {t("excel.import")}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => exportPacksToExcel(packs, t)}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        {t("excel.export")}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">{t("inventory.totalPacks")}</p>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="p-6 pt-0">
                        <div className="text-2xl font-bold">{total}</div>
                    </div>
                </Card>
                <Card>
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">{t("inventory.onSiteCount")}</p>
                        <MapPin className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="p-6 pt-0">
                        <div className="text-2xl font-bold text-green-600">{onSiteCount}</div>
                    </div>
                </Card>
                <Card>
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">{t("inventory.loanedCount")}</p>
                        <ArrowRightLeft className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="p-6 pt-0">
                        <div className="text-2xl font-bold text-amber-600">{loanedCount}</div>
                    </div>
                </Card>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t("common.search")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={statusFilter === "" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("")}
                    >
                        {t("inventory.allStatuses")}
                    </Button>
                    <Button
                        variant={statusFilter === "EN_SITIO" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("EN_SITIO")}
                    >
                        <MapPin className="mr-1 h-3 w-3" />
                        En Sitio
                    </Button>
                    <Button
                        variant={statusFilter === "PRESTADO" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("PRESTADO")}
                    >
                        <ArrowRightLeft className="mr-1 h-3 w-3" />
                        Prestado
                    </Button>
                </div>
            </div>

            {/* Inventory Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-3 py-3 text-left font-medium text-xs text-muted-foreground">ID</th>
                                    <th className="px-3 py-3 text-left font-medium">Código</th>
                                    <th className="px-3 py-3 text-left font-medium">Speaking Pack Test</th>
                                    <th className="px-3 py-3 text-left font-medium">Aplicación / Colegio</th>
                                    <th className="px-3 py-3 text-left font-medium">Estatus</th>
                                    <th className="px-3 py-3 text-left font-medium">Fecha de Registro</th>
                                    <th className="px-3 py-3 text-left font-medium">Aplicador</th>
                                    <th className="px-3 py-3 text-left font-medium">Fecha y Hora Salida</th>
                                    <th className="px-3 py-3 text-left font-medium">Fecha y Hora Entrada</th>
                                    <th className="px-3 py-3 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                                            {t("common.loading")}
                                        </td>
                                    </tr>
                                ) : packs.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                                            {t("common.noResults")}
                                        </td>
                                    </tr>
                                ) : (
                                    packs.map((pack) => (
                                        <tr
                                            key={pack.id}
                                            className="border-b transition-colors hover:bg-muted/40"
                                        >
                                            {/* ID (short) */}
                                            <td className="px-3 py-3 text-xs text-muted-foreground font-mono">
                                                {pack.id.slice(0, 6)}…
                                            </td>
                                            {/* Código */}
                                            <td className="px-3 py-3 font-mono font-semibold">
                                                {pack.codigo}
                                            </td>
                                            {/* Speaking Pack Test */}
                                            <td className="px-3 py-3">
                                                {pack.nombre || "—"}
                                            </td>
                                            {/* Colegio */}
                                            <td className="px-3 py-3 text-muted-foreground">
                                                {pack.school?.name || "—"}
                                            </td>
                                            {/* Estatus */}
                                            <td className="px-3 py-3">
                                                <Badge
                                                    className={
                                                        pack.status === "EN_SITIO"
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                                    }
                                                >
                                                    {pack.status === "EN_SITIO" ? "En Sitio" : "Prestado"}
                                                </Badge>
                                            </td>
                                            {/* Fecha de Registro */}
                                            <td className="px-3 py-3 text-muted-foreground text-xs">
                                                {pack.created_at
                                                    ? new Date(pack.created_at).toLocaleDateString("es-MX")
                                                    : "—"}
                                            </td>
                                            {/* Aplicador */}
                                            <td className="px-3 py-3 text-muted-foreground">
                                                {pack.applicator?.name || "—"}
                                            </td>
                                            {/* Hora Salida */}
                                            <td className="px-3 py-3 font-mono text-xs text-amber-600">
                                                {pack.hora_salida || "—"}
                                            </td>
                                            {/* Hora Entrada */}
                                            <td className="px-3 py-3 font-mono text-xs text-green-600">
                                                {pack.hora_entrada || "—"}
                                            </td>
                                            {/* Acciones */}
                                            <td className="px-3 py-3 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(pack)}
                                                        >
                                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                                            Cambiar a {pack.status === "EN_SITIO" ? "Prestado" : "En Sitio"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
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
