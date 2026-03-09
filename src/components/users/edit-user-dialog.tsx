"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Loader2, Save, X, Building } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const AVAILABLE_MODULES = [
    { id: "cenni", label: "CENNI" },
    { id: "finanzas", label: "Finanzas" },
    { id: "examenes", label: "Exámenes" },
    { id: "inventario", label: "Inventario" },
    { id: "escuelas", label: "Escuelas" },
    { id: "eventos", label: "Eventos" },
];

const LOCATIONS = [
    "Hermosillo",
    "Obregón",
    "Baja California",
    "Estatal",
    "Nacional",
    "Oficina Central"
];

interface EditUserDialogProps {
    memberId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditUserDialog({ memberId, open, onOpenChange, onSuccess }: EditUserDialogProps) {
    const { data, isLoading } = useSWR(memberId ? `/api/v1/users/${memberId}` : null, fetcher);

    const [role, setRole] = useState<string>("operador");
    const [location, setLocation] = useState<string>("none"); // 'none' translates to null
    const [jobTitle, setJobTitle] = useState<string>("");
    const [permissions, setPermissions] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (data?.member) {
            setRole(data.member.role);
            setLocation(data.member.location || "none");
            setJobTitle(data.member.job_title || "");
            setPermissions(data.access || []);
        }
    }, [data]);

    const togglePermission = (moduleId: string, type: 'can_view' | 'can_edit' | 'can_delete') => {
        setPermissions(prev => {
            const existing = prev.find(p => p.module === moduleId);
            if (existing) {
                const updatedRow = { ...existing, [type]: !existing[type] };
                return prev.map(p => p.module === moduleId ? updatedRow : p);
            } else {
                return [...prev, { module: moduleId, can_view: type === 'can_view', can_edit: type === 'can_edit', can_delete: type === 'can_delete' }];
            }
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/v1/users/${memberId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role,
                    location: location === "none" ? null : location,
                    job_title: jobTitle,
                    permissions: permissions.filter(p => p.can_view || p.can_edit || p.can_delete)
                }),
            });

            if (!res.ok) throw new Error();

            toast.success("Usuario actualizado correctamente");
            onSuccess();
            onOpenChange(false);
        } catch {
            toast.error("Error al guardar cambios");
        } finally {
            setIsSaving(false);
        }
    };

    const getPermission = (moduleId: string, type: string) => {
        return permissions.find(p => p.module === moduleId)?.[type] || false;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#002e5d]">
                        <Shield className="h-5 w-5" />
                        Gestionar Perfil y Permisos: {data?.member?.full_name}
                    </DialogTitle>
                    <DialogDescription>
                        Configura la asignación de base y los niveles de acceso por módulo para este colaborador.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex h-32 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Core Profile Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1 pb-4 border-b items-start">
                            <div className="space-y-2">
                                <Label className="font-bold">Rol (Sistema)</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrador (Total)</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="operador">Operador (Oficina)</SelectItem>
                                        <SelectItem value="applicator">Aplicador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-1">
                                    Rol (Empresa)
                                </Label>
                                <Input
                                    placeholder="Ej. Coordinador Académico"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold flex items-center gap-1">
                                    <Building className="h-4 w-4" /> Sede Asignada
                                </Label>
                                <Select value={location} onValueChange={setLocation}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sede/Clave" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-muted-foreground italic">Ninguna Sede Asignada</SelectItem>
                                        {LOCATIONS.map((loc) => (
                                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Permissions Matrix */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <Label className="font-bold">Acceso a Módulos</Label>
                                <span className="text-xs text-muted-foreground italic">* Los administradores ignoran estos límites</span>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">Módulo</th>
                                            <th className="text-center p-3 font-semibold">Ver</th>
                                            <th className="text-center p-3 font-semibold">Editar</th>
                                            <th className="text-center p-3 font-semibold">Eliminar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {AVAILABLE_MODULES.map((mod) => (
                                            <tr key={mod.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="p-3 font-medium text-[#002e5d]">{mod.label}</td>
                                                <td className="p-3 text-center">
                                                    <Checkbox
                                                        checked={getPermission(mod.id, 'can_view')}
                                                        onCheckedChange={() => togglePermission(mod.id, 'can_view')}
                                                        className="data-[state=checked]:bg-[#002e5d] border-muted-foreground"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Checkbox
                                                        checked={getPermission(mod.id, 'can_edit')}
                                                        onCheckedChange={() => togglePermission(mod.id, 'can_edit')}
                                                        className="data-[state=checked]:bg-[#002e5d] border-muted-foreground"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Checkbox
                                                        checked={getPermission(mod.id, 'can_delete')}
                                                        onCheckedChange={() => togglePermission(mod.id, 'can_delete')}
                                                        className="data-[state=checked]:bg-red-500 border-muted-foreground"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="border-t pt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        <X className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="bg-[#002e5d] hover:bg-[#001f3f]"
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
