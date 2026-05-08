"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { 
    Plus, 
    Trash2, 
    Edit2, 
    UserCircle, 
    Loader2,
    DollarSign,
    Briefcase,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface EventStaff {
    id: string;
    applicator_id: string;
    role: "SE" | "ADMIN" | "INVIGILATOR" | "SUPER";
    hourly_rate: number | null;
    fixed_payment: number | null;
    notes: string | null;
    acknowledgment_status?: string | null;
    acknowledged_at?: string | null;
    applicator: {
        id: string;
        name: string;
        email: string;
        rate_per_hour: number;
    };
}

interface Applicator {
    id: string;
    name: string;
    email: string;
    rate_per_hour: number;
}

export function EventStaffManager({ eventId }: { eventId: string }) {
    const { data: staffData, isLoading: staffLoading } = useSWR(`/api/v1/events/${eventId}/staff`, fetcher);
    const { data: appData } = useSWR(`/api/v1/applicators`, fetcher);
    
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        applicator_id: "",
        role: "INVIGILATOR" as const,
        hourly_rate: "" as string | number,
        fixed_payment: "" as string | number,
        notes: ""
    });

    const staff: EventStaff[] = staffData?.staff || [];
    const applicators: Applicator[] = appData?.applicators || [];

    const ackBadge = (s: EventStaff) => {
        const a = s.acknowledgment_status ?? "pending";
        if (a === "accepted") {
            return (
                <Badge className="text-[10px] bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15 dark:text-emerald-400 border border-emerald-600/25">
                    Confirmado
                </Badge>
            );
        }
        if (a === "declined") {
            return (
                <Badge variant="destructive" className="text-[10px]">
                    Rechazó
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-[10px] border-amber-500/60 text-amber-700 dark:text-amber-400">
                Pendiente
            </Badge>
        );
    };

    const handleAdd = async () => {
        if (!formData.applicator_id) {
            toast.error("Selecciona un aplicador");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`/api/v1/events/${eventId}/staff`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
                    fixed_payment: formData.fixed_payment ? Number(formData.fixed_payment) : null,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al asignar");
            }

            toast.success("Staff asignado correctamente");
            mutate(`/api/v1/events/${eventId}/staff`);
            setIsAdding(false);
            setFormData({
                applicator_id: "",
                role: "INVIGILATOR",
                hourly_rate: "",
                fixed_payment: "",
                notes: ""
            });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (staffId: string) => {
        if (!confirm("¿Eliminar esta asignación?")) return;

        try {
            const res = await fetch(`/api/v1/events/${eventId}/staff/${staffId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Error al eliminar");

            toast.success("Staff eliminado");
            mutate(`/api/v1/events/${eventId}/staff`);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (staffLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-500" />
                    Personal del Evento
                </h3>
                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Asignar Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nueva Asignación de Staff</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Aplicador</Label>
                                <Select 
                                    value={formData.applicator_id} 
                                    onValueChange={(v) => {
                                        const app = applicators.find(a => a.id === v);
                                        setFormData(prev => ({ 
                                            ...prev, 
                                            applicator_id: v,
                                            hourly_rate: app?.rate_per_hour || ""
                                        }));
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un aplicador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {applicators.map(app => (
                                            <SelectItem key={app.id} value={app.id}>
                                                {app.name} ({app.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Rol</Label>
                                    <Select 
                                        value={formData.role} 
                                        onValueChange={(v: any) => setFormData(prev => ({ ...prev, role: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SE">Speaking Examiner (SE)</SelectItem>
                                            <SelectItem value="ADMIN">Administrator</SelectItem>
                                            <SelectItem value="INVIGILATOR">Invigilator</SelectItem>
                                            <SelectItem value="SUPER">Supervisor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tarifa por Hora ($)</Label>
                                    <Input 
                                        type="number" 
                                        value={formData.hourly_rate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                                        placeholder="Default del aplicador"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Pago Fijo ($) - Opcional</Label>
                                <Input 
                                    type="number" 
                                    value={formData.fixed_payment}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fixed_payment: e.target.value }))}
                                    placeholder="Ej. Viáticos fijos o bono"
                                />
                                <p className="text-[10px] text-muted-foreground">Si se define, se sumará al cálculo por horas.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas</Label>
                                <Input 
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Instrucciones especiales..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
                            <Button onClick={handleAdd} disabled={isSaving}>
                                {isSaving ? "Guardando..." : "Asignar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {staff.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                        <p>No hay personal asignado a este evento todavía.</p>
                        <p className="text-xs">Usa el botón &quot;Asignar Staff&quot; para comenzar.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {staff.map((item) => (
                        <Card key={item.id} className="overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
                                            <UserCircle className="h-6 w-6 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{item.applicator.name}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary" className="text-[10px] uppercase">
                                                    {item.role}
                                                </Badge>
                                                {ackBadge(item)}
                                                <span className="text-xs text-muted-foreground">
                                                    {item.applicator.email}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Compensación</p>
                                            <div className="flex items-center gap-2 justify-end">
                                                <div className="flex items-center text-sm font-semibold text-green-600">
                                                    <DollarSign className="h-3 w-3" />
                                                    {item.hourly_rate || item.applicator.rate_per_hour}/hr
                                                </div>
                                                {item.fixed_payment && (
                                                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                                                        +{item.fixed_payment} fijo
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                {item.notes && (
                                    <div className="bg-muted/30 px-4 py-2 border-t text-[11px] text-muted-foreground italic">
                                        <strong>Nota:</strong> {item.notes}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
