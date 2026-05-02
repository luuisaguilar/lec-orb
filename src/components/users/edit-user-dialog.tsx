"use client";

import { useEffect, useState, Fragment } from "react";
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
    const { data: modulesData, isLoading: loadingModules } = useSWR("/api/v1/modules", fetcher);

    const [role, setRole] = useState<string>("operador");
    const [location, setLocation] = useState<string>("none"); // 'none' translates to null
    const [jobTitle, setJobTitle] = useState<string>("");
    const [permissions, setPermissions] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const availableModules = modulesData?.modules || [];

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

    const toggleAllForModule = (moduleId: string) => {
        setPermissions(prev => {
            const existing = prev.find(p => p.module === moduleId);
            const allChecked = existing?.can_view && existing?.can_edit && existing?.can_delete;
            
            if (existing) {
                const updatedRow = { ...existing, can_view: !allChecked, can_edit: !allChecked, can_delete: !allChecked };
                return prev.map(p => p.module === moduleId ? updatedRow : p);
            } else {
                return [...prev, { module: moduleId, can_view: true, can_edit: true, can_delete: true }];
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

    // Group modules by category
    const modulesByCategory = availableModules.reduce((acc: any, mod: any) => {
        const cat = mod.category || "Otros";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(mod);
        return acc;
    }, {});

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#002e5d]">
                        <Shield className="h-5 w-5" />
                        Gestionar Perfil y Permisos: {data?.member?.full_name}
                    </DialogTitle>
                    <DialogDescription>
                        Configura la asignación de base y los niveles de acceso por módulo para este colaborador.
                    </DialogDescription>
                </DialogHeader>

                {isLoading || loadingModules ? (
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
                                            <th className="text-center p-3 font-semibold">Todo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {Object.keys(modulesByCategory).map((category) => (
                                            <Fragment key={category}>
                                                <tr className="bg-slate-900/60 border-y border-slate-800">
                                                    <td colSpan={5} className="p-2.5 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left bg-slate-950/30">
                                                        {category}
                                                    </td>
                                                </tr>
                                                {modulesByCategory[category].map((mod: any) => (
                                                    <tr key={mod.slug} className="hover:bg-slate-800/40 border-b border-slate-800/50 transition-colors group">
                                                        <td className="p-3 px-4 font-bold text-slate-100 text-left group-hover:text-primary transition-colors">{mod.name}</td>
                                                        <td className="p-3 text-center">
                                                            <Checkbox
                                                                checked={getPermission(mod.slug, 'can_view')}
                                                                onCheckedChange={() => togglePermission(mod.slug, 'can_view')}
                                                                className="data-[state=checked]:bg-blue-500 border-slate-600 data-[state=checked]:border-blue-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Checkbox
                                                                checked={getPermission(mod.slug, 'can_edit')}
                                                                onCheckedChange={() => togglePermission(mod.slug, 'can_edit')}
                                                                className="data-[state=checked]:bg-indigo-500 border-slate-600 data-[state=checked]:border-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Checkbox
                                                                checked={getPermission(mod.slug, 'can_delete')}
                                                                onCheckedChange={() => togglePermission(mod.slug, 'can_delete')}
                                                                className="data-[state=checked]:bg-red-600 border-slate-600 data-[state=checked]:border-red-600"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-3 text-[10px] uppercase font-black tracking-wider text-slate-500 hover:text-white hover:bg-slate-800 rounded-full"
                                                                onClick={() => toggleAllForModule(mod.slug)}
                                                            >
                                                                {getPermission(mod.slug, 'can_view') && getPermission(mod.slug, 'can_edit') && getPermission(mod.slug, 'can_delete') ? 'Ninguno' : 'Todos'}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </Fragment>
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
