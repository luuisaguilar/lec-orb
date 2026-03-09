"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Link as LinkIcon, Calendar, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LinkToeflSessionDialogProps {
    code: any; // Raw code object
    onSuccess?: () => void;
    children?: React.ReactNode;
}

export function LinkToeflSessionDialog({ code, onSuccess, children }: LinkToeflSessionDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch active administrations
    const { data, isLoading } = useSWR("/api/v1/toefl/administrations", fetcher);
    const administrations = data?.administrations || [];

    const handleLink = async () => {
        if (!selectedSession) {
            toast.error("Por favor selecciona una sesión.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/v1/toefl/codes/${code.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: selectedSession }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al vincular sesión");
            }

            toast.success("Código vinculado a la sesión exitosamente.");
            setOpen(false);
            onSuccess?.();
            setSelectedSession("");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm">
                        <LinkIcon className="h-4 w-4 mr-2" /> Vincular
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Vincular a Sesión TOEFL</DialogTitle>
                    <DialogDescription>
                        Asigna el folio <strong>{code.folio}</strong> a un evento (Administración TOEFL) programado.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium">Sesión Disponible</label>
                        <Select value={selectedSession} onValueChange={setSelectedSession}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={isLoading ? "Cargando sesiones..." : "Selecciona una sesión"} />
                            </SelectTrigger>
                            <SelectContent>
                                {administrations.map((admin: any) => (
                                    <SelectItem key={admin.id} value={admin.id}>
                                        <div className="flex flex-col text-left">
                                            <span className="font-semibold flex items-center">
                                                <GraduationCap className="w-4 h-4 mr-1 text-lec-blue" />
                                                {admin.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center mt-0.5">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {format(new Date(admin.start_date), "dd MMMM yyyy", { locale: es })}
                                                <span className="mx-2">-</span>
                                                {format(new Date(admin.end_date), "dd MMMM yyyy", { locale: es })}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleLink} disabled={!selectedSession || isSubmitting} className="font-semibold bg-[#0034a1] hover:bg-[#0034a1]/90">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Vinculación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
