"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Check,
    CheckCircle2,
    Copy,
    Link2,
    Loader2,
    Mail,
    Shield,
    UserPlus,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const formSchema = z.object({
    email: z.string().email("Correo electronico invalido"),
    role: z.enum(["admin", "supervisor", "operador", "applicator"], {
        message: "Debes seleccionar un rol para el usuario",
    }),
});

interface InviteUserDialogProps {
    onInviteSuccess: () => void;
}

interface InviteResult {
    email: string;
    joinUrl: string;
    emailSent: boolean;
    sendEmailRequested: boolean;
}

export function InviteUserDialog({ onInviteSuccess }: InviteUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [copied, setCopied] = useState(false);
    const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            role: "operador",
        },
    });

    function resetDialogState() {
        setSendEmail(true);
        setCopied(false);
        setInviteResult(null);
        form.reset();
    }

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);
        if (!nextOpen) {
            resetDialogState();
        }
    }

    async function copyLink() {
        if (!inviteResult?.joinUrl) return;

        try {
            await navigator.clipboard.writeText(inviteResult.joinUrl);
            setCopied(true);
            toast.success("Enlace copiado");
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("No se pudo copiar el enlace");
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        setCopied(false);
        setInviteResult(null);

        try {
            const response = await fetch("/api/v1/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...values, sendEmail }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || "No se pudo crear la invitacion.");
            }

            setInviteResult({
                email: values.email,
                joinUrl: data.joinUrl,
                emailSent: Boolean(data.emailSent),
                sendEmailRequested: sendEmail,
            });

            form.reset();
            onInviteSuccess();

            if (!sendEmail) {
                toast.success("Enlace de invitacion generado");
            } else if (data.emailSent) {
                toast.success("Invitacion enviada");
            } else {
                toast.warning("Invitacion creada sin email");
            }
        } catch (error: unknown) {
            toast.error("Error", {
                description:
                    error instanceof Error
                        ? error.message
                        : "No se pudo crear la invitacion en este momento.",
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
                        Crea una invitacion, comparte el enlace y envia el email solo cuando lo necesites.
                    </DialogDescription>
                </DialogHeader>

                {inviteResult ? (
                    <div className="space-y-4 py-4">
                        <Alert>
                            {inviteResult.sendEmailRequested && inviteResult.emailSent ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <Link2 className="h-4 w-4 text-[#002e5d]" />
                            )}
                            <AlertTitle>
                                {inviteResult.sendEmailRequested && inviteResult.emailSent
                                    ? "Email de invitacion enviado"
                                    : inviteResult.sendEmailRequested
                                        ? "Invitacion creada sin envio de email"
                                        : "Enlace de invitacion listo"}
                            </AlertTitle>
                            <AlertDescription>
                                {inviteResult.sendEmailRequested && inviteResult.emailSent
                                    ? `El correo se envio a ${inviteResult.email}. Tambien puedes compartir el enlace manualmente si lo necesitas.`
                                    : inviteResult.sendEmailRequested
                                        ? `La invitacion para ${inviteResult.email} se creo correctamente, pero el email no pudo enviarse. Comparte este enlace manualmente.`
                                        : `Comparte este enlace con ${inviteResult.email} para que pueda unirse a la organizacion.`}
                            </AlertDescription>
                        </Alert>

                        <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Link2 className="h-4 w-4" />
                                Enlace de acceso
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={inviteResult.joinUrl}
                                    className="bg-white font-mono text-xs"
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={copyLink}
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                El enlace seguira funcionando mientras la invitacion permanezca pendiente.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                                Cerrar
                            </Button>
                            <Button
                                type="button"
                                onClick={copyLink}
                                className="gap-2 bg-[#002e5d] hover:bg-[#001f3f]"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copiado" : "Copiar enlace"}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo electronico</FormLabel>
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
                                        <FormLabel>Rol de acceso</FormLabel>
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
                                            Los administradores tienen acceso total a configuracion y facturacion.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-800">
                                            Enviar email automaticamente
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Si lo desactivas, solo se creara la invitacion y obtendras el enlace para copiarlo.
                                        </p>
                                    </div>
                                    <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-[#002e5d] hover:bg-[#001f3f]">
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {sendEmail ? "Crear y enviar" : "Crear y copiar enlace"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
