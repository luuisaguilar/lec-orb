"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import useSWR from "swr";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AddApplicatorDialog } from "@/components/applicators/add-applicator-dialog";
import {
    ScanBarcode,
    ArrowDownToLine,
    ArrowUpFromLine,
    Wrench,
    Loader2,
    Package,
    Clock,
    Plus,
} from "lucide-react";

interface Pack {
    id: string;
    codigo: string;
    nombre: string;
    status: "EN_SITIO" | "PRESTADO";
    notes: string | null;
}

interface Movement {
    id: string;
    type: string;
    new_status: string;
    school_name: string | null;
    applicator_name: string | null;
    created_at: string;
}

interface OptionItem {
    id: string;
    name: string;
    authorized_exams?: string[] | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ScanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMovement: () => void;
    onAddPack?: (codigo: string) => void;
}

export function ScanDialog({ open, onOpenChange, onMovement, onAddPack }: ScanDialogProps) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const [codigo, setCodigo] = useState("");
    const [pack, setPack] = useState<Pack | null>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [isLooking, setIsLooking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

    // Form selection state for SALIDA
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
    const [selectedApplicatorId, setSelectedApplicatorId] = useState<string>("");
    const [showAddApplicator, setShowAddApplicator] = useState(false);

    // Fetch lists
    const { data: schoolsData } = useSWR("/api/v1/schools", fetcher);
    const { data: applicatorsData, mutate: mutateApplicators } = useSWR("/api/v1/applicators", fetcher);

    const schools: OptionItem[] = schoolsData?.schools || [];
    const applicators: OptionItem[] = applicatorsData?.applicators || [];
    const filteredApplicators = applicators.filter(a => a.authorized_exams && a.authorized_exams.length > 0);

    useEffect(() => {
        if (open) {
            const id = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(id);
        } else {
            setCodigo("");
            setPack(null);
            setMovements([]);
            setSelectedSchoolId("");
            setSelectedApplicatorId("");
            setNotFoundCode(null);
        }
    }, [open]);

    const refocusInput = useCallback(() => {
        if (open && !isProcessing) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open, isProcessing]);

    // Look up pack by code
    async function lookupPack(code: string) {
        if (!code.trim()) return;
        setIsLooking(true);
        setPack(null);
        setMovements([]);
        setNotFoundCode(null);

        try {
            const res = await fetch(
                `/api/v1/scan?codigo=${encodeURIComponent(code.trim())}`
            );
            if (res.ok) {
                const data = await res.json();
                setPack(data.pack);
                setMovements(data.movements || []);
            } else {
                setNotFoundCode(code.trim());
            }
        } catch {
            toast.error(t("scan.error"));
        } finally {
            setIsLooking(false);
            refocusInput();
        }
    }

    // Handle barcode scan (Enter key from keyboard wedge)
    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            lookupPack(codigo);
        }
    }

    // Process movement
    async function processMovement(type: "SALIDA" | "ENTRADA" | "AJUSTE") {
        if (!pack) return;
        if (type === "SALIDA" && !selectedSchoolId) {
            toast.error("Por favor selecciona un colegio para registrar la salida");
            return;
        }

        setIsProcessing(true);

        const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
        const selectedApplicator = applicators.find((a) => a.id === selectedApplicatorId);

        try {
            const res = await fetch("/api/v1/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    codigo: pack.codigo,
                    type,
                    // Send actual UUIDs and names for SALIDA
                    school_id: type === "SALIDA" ? selectedSchool?.id || null : null,
                    school_name: type === "SALIDA" ? selectedSchool?.name || null : null,
                    applicator_id: type === "SALIDA" ? selectedApplicator?.id || null : null,
                    applicator_name: type === "SALIDA" ? selectedApplicator?.name || null : null,
                }),
            });

            if (res.ok) {
                toast.success(t("scan.success"));
                onMovement();
                // Re-lookup to show updated state
                await lookupPack(pack.codigo);
                // Clear code input for next scan
                setCodigo("");
            } else {
                const err = await res.json();
                toast.error(err.error || t("scan.error"));
            }
        } catch {
            toast.error(t("scan.error"));
        } finally {
            setIsProcessing(false);
            refocusInput();
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg" onClick={refocusInput}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ScanBarcode className="h-5 w-5" />
                        {t("scan.title")}
                    </DialogTitle>
                </DialogHeader>

                {/* Scan Input — large, auto-focused */}
                <div className="space-y-4">
                    <Input
                        ref={inputRef}
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("scan.placeholder")}
                        className="text-xl h-14 font-mono tracking-wider text-center"
                        autoComplete="off"
                        autoFocus
                    />

                    {isLooking && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {/* Not Found State */}
                    {notFoundCode && !pack && !isLooking && (
                        <Card className="border-2 border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10">
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-1 text-amber-900 dark:text-amber-200">
                                    <h3 className="font-semibold text-lg">Código no registrado</h3>
                                    <p className="text-sm">
                                        El código &quot;<strong>{notFoundCode}</strong>&quot; no se encuentra en el inventario.
                                    </p>
                                </div>
                                <Button
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                                    onClick={() => {
                                        onOpenChange(false);
                                        onAddPack?.(notFoundCode);
                                    }}
                                >
                                    Registrar nuevo pack
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pack Found */}
                    {pack && (
                        <Card className="border-2">
                            <CardContent className="pt-4 space-y-4">
                                {/* Pack Info */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Package className="h-8 w-8 text-muted-foreground" />
                                        <div>
                                            <p className="font-mono text-lg font-bold">
                                                {pack.codigo}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {pack.nombre || "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        className={
                                            pack.status === "EN_SITIO"
                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-base px-3 py-1"
                                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-base px-3 py-1"
                                        }
                                    >
                                        {pack.status === "EN_SITIO"
                                            ? t("inventory.statusOnSite")
                                            : t("inventory.statusLoaned")}
                                    </Badge>
                                </div>

                                {/* Dynamic Checkout Form */}
                                {pack.status === "EN_SITIO" && (
                                    <>
                                        <Separator />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Colegio (Obligatorio)</Label>
                                                <Select
                                                    value={selectedSchoolId}
                                                    onValueChange={setSelectedSchoolId}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar colegio" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {schools.map((school) => (
                                                            <SelectItem key={school.id} value={school.id}>
                                                                {school.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Aplicador (Opcional)</Label>
                                                <div className="flex gap-2">
                                                    <Select
                                                        value={selectedApplicatorId}
                                                        onValueChange={setSelectedApplicatorId}
                                                    >
                                                        <SelectTrigger className="flex-1">
                                                            <SelectValue placeholder="Seleccionar aplicador" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">Sin asignación</SelectItem>
                                                            {filteredApplicators.map((app) => (
                                                                <SelectItem key={app.id} value={app.id}>
                                                                    {app.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="shrink-0"
                                                        onClick={() => setShowAddApplicator(true)}
                                                        title="Registrar Nuevo Aplicador"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <Separator />

                                {/* Action Buttons — state-aware */}
                                <div className="flex gap-2">
                                    {pack.status === "EN_SITIO" && (
                                        <Button
                                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                            onClick={() => processMovement("SALIDA")}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                                            )}
                                            {t("scan.checkout")}
                                        </Button>
                                    )}
                                    {pack.status === "PRESTADO" && (
                                        <Button
                                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                            onClick={() => processMovement("ENTRADA")}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowDownToLine className="mr-2 h-4 w-4" />
                                            )}
                                            {t("scan.checkin")}
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => processMovement("AJUSTE")}
                                        disabled={isProcessing}
                                    >
                                        <Wrench className="mr-2 h-4 w-4" />
                                        {t("scan.adjust")}
                                    </Button>
                                </div>

                                {/* Recent Movements */}
                                {movements.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {t("scan.recentMovements")}
                                        </p>
                                        <div className="space-y-1">
                                            {movements.map((mov) => (
                                                <div
                                                    key={mov.id}
                                                    className="flex items-center gap-2 text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2"
                                                >
                                                    <Clock className="h-3 w-3 shrink-0" />
                                                    <span className="font-medium">{mov.type}</span>
                                                    <span>→</span>
                                                    <span>{mov.new_status}</span>
                                                    {mov.school_name && (
                                                        <span className="truncate">
                                                            · {mov.school_name}
                                                        </span>
                                                    )}
                                                    <span className="ml-auto shrink-0">
                                                        {new Date(mov.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
            {/* Nested Add Applicator Dialog */}
            <AddApplicatorDialog
                open={showAddApplicator}
                onOpenChange={setShowAddApplicator}
                onSuccess={(newId) => {
                    mutateApplicators();
                    setShowAddApplicator(false);
                    if (newId) {
                        setSelectedApplicatorId(newId);
                    }
                }}
            />
        </Dialog>
    );
}
