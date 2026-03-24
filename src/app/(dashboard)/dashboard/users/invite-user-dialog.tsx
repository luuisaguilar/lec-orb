"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus, Mail, Shield, Loader2, Link2, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const formSchema = z.object({
    email: z.string().email("Correo electrónico inválido"),
    role: z.enum(["admin", "supervisor", "operador", "applicator"], {
        message: "Debes seleccionar un rol para el usuario"
    }),
});

interface InviteUserDialogProps {
    onInviteSuccess: () => void;
}

export function InviteUserDialog({ onInviteSuccess }: InviteUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            role: "operador",
        },
    });

    function handleOpenChange(value: boolean) {
        setOpen(value);
        if (!value) {
            setGeneratedLink(null);
            setCopied(false);
            setSendEmail(true);
            form.reset();
        }
    }

    async function copyLink() {
        if (!generatedLink) return;
        await navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        toast.success("Link copiado al portapapeles");
        setTimeout(() => setCopied(false), 2000);
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        setGeneratedLink(null);
        try {
            const res = await fetch("/api/v1/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...values, sendEmail }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Error al crear invitación");
            }

            const data = await res.json();

            if (sendEmail) {
                if (data.emailSent) {
                    toast.success("Invitación enviada", {
                        description: `Se envió un email de invitación a ${values.email}`,
                    });
                } else {
                    toast.warning("Invitación creada sin email", {
                        description: "La invitación se registró pero no se pudo enviar el email. Puedes compartir el link manualmente.",
                    });
                }
            } else {
                toast.success("Link de invitación generado", {
                    description: "Copia el link y compártelo con el usuario.",
                });
            }

            // Show the join link
            if (data.joinUrl) {
                setGeneratedLink(data.joinUrl);
            }

            if (sendEmail && data.emailSent) {
                form.reset();
                onInviteSuccess();
            } else {
                onInviteSuccess();
            }
        } catch (err) {
            toast.error("Error", {
                description: err instanceof Error ? err.message : "No se pudo enviar la invitación en este momento.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-[#002e5d] hover:bg-[#001f3f]">
                    <UserPlus className="h-4 w-4" />
                    Invitar Usuario
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Invitar al equipo</DialogTitle>
                    <DialogDescription>
                        Envía una invitación por email o genera un enlace para compartir manualmente.
                    </DialogDescription>
                </DialogHeader>

                {generatedLink ? (
                    /* ── Link result view ── */
                    <div className="space-y-4 py-4">
                        <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Link2 className="h-4 w-4" />
                                Link de invitación
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={generatedLink}
                                    className="text-xs font-mono bg-white"
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={copyLink}
                                    className="shrink-0"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Comparte este enlace con el usuario invitado. Permanecerá activo mientras la invitación esté vigente.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                            >
                                Cerrar
                            </Button>
                            <Button
                                type="button"
                                onClick={copyLink}
                                className="gap-2 bg-[#002e5d] hover:bg-[#001f3f]"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copiado" : "Copiar Link"}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    /* ── Invite form ── */
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo Electrónico</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="correo@ejemplo.com" className="pl-9" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rol de Acceso</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                                        <SelectValue placeholder="Selecciona un rol" />
                                                    </div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="admin">Administrador</SelectItem>
                                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                                <SelectItem value="operador">Operador (Oficina)</SelectItem>
                                                <SelectItem value="applicator">Aplicador</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Los administradores tienen acceso total a configuración y facturación.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* ── Delivery mode toggle ── */}
                            <div className="rounded-lg border p-3 space-y-2">
                                <p className="text-sm font-medium text-slate-700">Método de invitación</p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={sendEmail ? "default" : "outline"}
                                        className={sendEmail ? "bg-[#002e5d] hover:bg-[#001f3f] gap-1.5" : "gap-1.5"}
                                        onClick={() => setSendEmail(true)}
                                    >
                                        <Mail className="h-3.5 w-3.5" />
                                        Enviar email
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={!sendEmail ? "default" : "outline"}
                                        className={!sendEmail ? "bg-[#002e5d] hover:bg-[#001f3f] gap-1.5" : "gap-1.5"}
                                        onClick={() => setSendEmail(false)}
                                    >
                                        <Link2 className="h-3.5 w-3.5" />
                                        Solo generar link
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {sendEmail
                                        ? "Se enviará un correo de invitación al usuario."
                                        : "Se generará un enlace para que lo compartas manualmente."}
                                </p>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-[#002e5d] hover:bg-[#001f3f]">
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {sendEmail ? "Enviar Invitación" : "Generar Link"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
