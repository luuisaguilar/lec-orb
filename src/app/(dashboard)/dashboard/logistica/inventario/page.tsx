"use client";

import React, { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { 
    Package, 
    Search, 
    Filter, 
    Plus, 
    ArrowLeftRight, 
    History, 
    MapPin, 
    Truck,
    MoreVertical,
    AlertTriangle,
    CheckCircle2,
    BookOpen,
    ArrowRight,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogisticsInventoryImportDialog } from "@/components/inventory/logistics-inventory-import-dialog";

// Re-using the same Dialog implementation if needed or importing from correct path
// I'll stick to @/components/ui/dialog as verified before
import {
    Dialog as ShDialog,
    DialogContent as ShDialogContent,
    DialogDescription as ShDialogDescription,
    DialogFooter as ShDialogFooter,
    DialogHeader as ShDialogHeader,
    DialogTitle as ShDialogTitle,
} from "@/components/ui/dialog";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InventoryPage() {
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isNewItemOpen, setIsNewItemOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isSavingItem, setIsSavingItem] = useState(false);
    const [newItem, setNewItem] = useState({
        name: "",
        sku: "",
        category: "",
        min_stock_level: "5",
        description: "",
    });
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Form state for transfer
    const [transferData, setTransferData] = useState({
        toLocationId: "",
        quantity: 0
    });

    // Real Data Fetching
    const { data: inventory, isLoading: isLoadingInv } = useSWR('/api/v1/inventory', fetcher);
    const { data: locations, isLoading: isLoadingLocs } = useSWR('/api/v1/inventory/locations', fetcher);
    const { data: transfers, isLoading: isLoadingTrans } = useSWR('/api/v1/inventory/transfers', fetcher);

    const handleOpenTransfer = (item: any) => {
        setSelectedItem(item);
        setTransferData({ toLocationId: "", quantity: 0 });
        setIsTransferOpen(true);
    };

    const resetNewItemForm = () =>
        setNewItem({ name: "", sku: "", category: "", min_stock_level: "5", description: "" });

    const handleCreateItem = async () => {
        const name = newItem.name.trim();
        if (!name) {
            toast.error("El nombre del producto es obligatorio");
            return;
        }
        const min = Number(newItem.min_stock_level);
        setIsSavingItem(true);
        try {
            const res = await fetch("/api/v1/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    sku: newItem.sku.trim() || undefined,
                    category: newItem.category.trim() || undefined,
                    min_stock_level: Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 5,
                    description: newItem.description.trim() || undefined,
                }),
            });
            if (res.ok) {
                toast.success("Producto creado");
                mutate("/api/v1/inventory");
                setIsNewItemOpen(false);
                resetNewItemForm();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "No se pudo crear (¿permiso de edición en inventario?)");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setIsSavingItem(false);
        }
    };

    const handleProcessTransfer = async () => {
        if (!transferData.toLocationId || transferData.quantity <= 0) {
            toast.error("Complete todos los campos correctamente");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await fetch('/api/v1/inventory/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: selectedItem.id,
                    fromLocationId: null, // Defaulting from central or wherever it has stock in this simple version
                    toLocationId: transferData.toLocationId,
                    quantity: transferData.quantity
                })
            });

            if (res.ok) {
                toast.success("Transferencia procesada");
                mutate('/api/v1/inventory');
                mutate('/api/v1/inventory/transfers');
                setIsTransferOpen(false);
            } else {
                const err = await res.json();
                toast.error(err.error || "Error al procesar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsProcessing(false);
        }
    };

    // Analytics
    const stats = useMemo(() => {
        if (!inventory) return { totalValue: 0, lowStock: 0, totalItems: 0 };
        return {
            totalValue: inventory.reduce((acc: number, item: any) => acc + (item.total * 150), 0), // Mock unit price for display
            lowStock: inventory.filter((item: any) => item.total < item.min).length,
            totalItems: inventory.length
        };
    }, [inventory]);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Logística e Inventario</h1>
                    <p className="text-muted-foreground">Control real de stock y movimientos entre sedes y eventos.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsImportOpen(true)}>
                        Importar Excel
                    </Button>
                    <Button
                        type="button"
                        className="bg-primary text-primary-foreground"
                        onClick={() => setIsNewItemOpen(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Item
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="stock" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mb-4">
                    <TabsTrigger value="stock" className="flex gap-2">
                        <Package className="w-4 h-4" />
                        Stock Global
                    </TabsTrigger>
                    <TabsTrigger value="transfers" className="flex gap-2">
                        <Truck className="w-4 h-4" />
                        Transferencias
                    </TabsTrigger>
                    <TabsTrigger value="locations" className="flex gap-2">
                        <MapPin className="w-4 h-4" />
                        Ubicaciones
                    </TabsTrigger>
                </TabsList>

                {/* Stock Global Tab */}
                <TabsContent value="stock" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-primary/5 border-primary/10">
                            <CardContent className="pt-6">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productos</p>
                                <h3 className="text-2xl font-bold mt-1">{isLoadingInv ? "..." : stats.totalItems}</h3>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor Estimado</p>
                                <h3 className="text-2xl font-bold mt-1 text-emerald-600">${stats.totalValue.toLocaleString()}</h3>
                            </CardContent>
                        </Card>
                        <Card className={stats.lowStock > 0 ? "border-orange-500/50 bg-orange-500/5" : ""}>
                            <CardContent className="pt-6">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alerta Stock Bajo</p>
                                <h3 className={`text-2xl font-bold mt-1 ${stats.lowStock > 0 ? "text-orange-500" : ""}`}>
                                    {stats.lowStock} Items
                                </h3>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasa de Movimiento</p>
                                <h3 className="text-2xl font-bold mt-1">100% Real</h3>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Buscar por SKU, nombre..." className="pl-10" />
                        </div>
                        <Button variant="secondary" className="flex gap-2">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </Button>
                    </div>

                    <div className="border rounded-lg bg-card overflow-hidden">
                        {isLoadingInv ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <p>Cargando inventario real...</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="text-right">Almacén</TableHead>
                                        <TableHead className="text-right">Ferias</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-center">Estatus</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventory?.map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{item.name}</span>
                                                    <span className="text-xs font-mono text-muted-foreground">{item.sku}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal">{item.category}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{item.warehouse}</TableCell>
                                            <TableCell className="text-right text-primary font-medium">{item.fair}</TableCell>
                                            <TableCell className="text-right font-bold">{item.total}</TableCell>
                                            <TableCell className="text-center">
                                                {item.total < item.min ? (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Reponer
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Disponible
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuItem>Ajustar Stock</DropdownMenuItem>
                                                        <DropdownMenuItem>Ver Movimientos</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem 
                                                            className="text-primary font-bold cursor-pointer"
                                                            onClick={() => handleOpenTransfer(item)}
                                                        >
                                                            Transferir a Feria
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </TabsContent>

                {/* Transfers Tab */}
                <TabsContent value="transfers" className="space-y-4">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Cant.</TableHead>
                                    <TableHead>Origen</TableHead>
                                    <TableHead>Destino</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Responsable</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingTrans ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">Cargando historial...</TableCell></TableRow>
                                ) : transfers?.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">No hay transferencias registradas.</TableCell></TableRow>
                                ) : transfers?.map((t: any) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium">{t.inventory_items?.name}</TableCell>
                                        <TableCell className="font-bold">{t.quantity}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{t.from?.name || "Externo"}</TableCell>
                                        <TableCell className="text-xs font-medium text-primary">{t.to?.name}</TableCell>
                                        <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-[10px] font-mono">{t.performed_by?.substring(0,8)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Locations Tab */}
                <TabsContent value="locations">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {locations?.map((loc: any) => (
                            <Card key={loc.id} className={loc.type === 'warehouse' ? "border-primary/30" : ""}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-bold">{loc.name}</CardTitle>
                                    {loc.type === 'warehouse' ? <MapPin className="h-4 w-4 text-primary" /> : <BookOpen className="h-4 w-4 text-primary" />}
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Ubicación {loc.type === 'warehouse' ? 'Central' : 'Evento'}</div>
                                    <Badge className="mt-2" variant={loc.is_active ? "default" : "secondary"}>
                                        {loc.is_active ? "Activa" : "Inactiva"}
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}

                        <Button variant="outline" className="h-full border-dashed border-2 flex flex-col gap-2 min-h-[140px]">
                            <Plus className="w-8 h-8 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Nueva Feria/Ubicación</span>
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>

            <LogisticsInventoryImportDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onSuccess={() => mutate("/api/v1/inventory")}
            />

            <ShDialog
                open={isNewItemOpen}
                onOpenChange={(open) => {
                    setIsNewItemOpen(open);
                    if (!open) resetNewItemForm();
                }}
            >
                <ShDialogContent className="sm:max-w-md">
                    <ShDialogHeader>
                        <ShDialogTitle>Nuevo producto</ShDialogTitle>
                        <ShDialogDescription>
                            Se guarda en inventario multi-ubicación. El stock por almacén se registra
                            después con transferencias o ajustes.
                        </ShDialogDescription>
                    </ShDialogHeader>
                    <div className="grid gap-3 py-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="inv-name">Nombre</Label>
                            <Input
                                id="inv-name"
                                value={newItem.name}
                                onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))}
                                placeholder="Ej. Speaking Pack A2"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="inv-sku">SKU (opcional)</Label>
                            <Input
                                id="inv-sku"
                                value={newItem.sku}
                                onChange={(e) => setNewItem((s) => ({ ...s, sku: e.target.value }))}
                                placeholder="Código interno"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="inv-cat">Categoría (opcional)</Label>
                            <Input
                                id="inv-cat"
                                value={newItem.category}
                                onChange={(e) => setNewItem((s) => ({ ...s, category: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="inv-min">Stock mínimo</Label>
                            <Input
                                id="inv-min"
                                type="number"
                                min={0}
                                value={newItem.min_stock_level}
                                onChange={(e) =>
                                    setNewItem((s) => ({ ...s, min_stock_level: e.target.value }))
                                }
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="inv-desc">Notas (opcional)</Label>
                            <Textarea
                                id="inv-desc"
                                rows={2}
                                value={newItem.description}
                                onChange={(e) =>
                                    setNewItem((s) => ({ ...s, description: e.target.value }))
                                }
                            />
                        </div>
                    </div>
                    <ShDialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsNewItemOpen(false);
                                resetNewItemForm();
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateItem} disabled={isSavingItem}>
                            {isSavingItem ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando…
                                </>
                            ) : (
                                "Guardar"
                            )}
                        </Button>
                    </ShDialogFooter>
                </ShDialogContent>
            </ShDialog>

            {/* Transfer Modal */}
            <ShDialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <ShDialogContent className="sm:max-w-[425px]">
                    <ShDialogHeader>
                        <ShDialogTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="w-5 h-5 text-primary" />
                            Transferencia de Inventario
                        </ShDialogTitle>
                        <ShDialogDescription>
                            Mueve stock físico entre ubicaciones registradas.
                        </ShDialogDescription>
                    </ShDialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs uppercase text-muted-foreground">Item</Label>
                            <div className="p-3 bg-muted/50 rounded-lg border">
                                <p className="font-bold text-sm">{selectedItem?.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">Disponibilidad Central: {selectedItem?.warehouse} unidades</p>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location">Ubicación de Destino</Label>
                            <Select 
                                value={transferData.toLocationId} 
                                onValueChange={(val) => setTransferData(s => ({...s, toLocationId: val}))}
                            >
                                <SelectTrigger id="location">
                                    <SelectValue placeholder="Seleccione destino..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations?.filter((l: any) => l.type === 'event').map((loc: any) => (
                                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="quantity">Cantidad a Mover</Label>
                            <Input 
                                id="quantity" 
                                type="number" 
                                value={transferData.quantity || ""}
                                onChange={(e) => setTransferData(s => ({...s, quantity: Number(e.target.value)}))}
                                placeholder="Ej: 50" 
                                max={selectedItem?.warehouse || 0} 
                            />
                        </div>
                    </div>
                    <ShDialogFooter>
                        <Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancelar</Button>
                        <Button onClick={handleProcessTransfer} disabled={isProcessing || !selectedItem}>
                            {isProcessing ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                            ) : "Confirmar Movimiento"}
                        </Button>
                    </ShDialogFooter>
                </ShDialogContent>
            </ShDialog>
        </div>
    );
}
