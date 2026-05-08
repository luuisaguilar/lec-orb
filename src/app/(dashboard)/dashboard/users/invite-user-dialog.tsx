"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
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
    MapPin,
    Shield,
    Briefcase,
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

const CUSTOM_HR = "__custom__";

type HrProfileOption = {
    id: string;
    role_title: string;
    area?: string | null;
};

const formSchema = z
    .object({
        email: z.string().email("Correo electronico invalido"),
        role: z.enum(["admin", "supervisor", "operador", "applicator"], {
            message: "Debes seleccionar un rol para el usuario",
        }),
        job_title: z.string().max(200, "El puesto no puede exceder 200 caracteres").optional(),
        hr_profile_id: z.string(),
        location: z.string().min(1, "Selecciona una sede"),
    })
    .superRefine((data, ctx) => {
        if (data.hr_profile_id === CUSTOM_HR) {
            if (!data.job_title?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Escribe el rol empresa.",
                    path: ["job_title"],
                });
            }
            return;
        }
        if (!z.string().uuid().safeParse(data.hr_profile_id).success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Selecciona un perfil HR valido.",
                path: ["hr_profile_id"],
            });
        }
    });

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InviteUserDialogProps {
    onInviteSuccess: () => void;
    canManageLocations?: boolean;
    onOpenManageLocations?: () => void;
}

interface InviteResult {
    email: string;
    joinUrl: string;
    emailSent: boolean;
    sendEmailRequested: boolean;
}

export function InviteUserDialog({
    onInviteSuccess,
    canManageLocations,
    onOpenManageLocations,
}: InviteUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [copied, setCopied] = useState(false);
    const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

    const { data: hrProfilesData } = useSWR("/api/v1/hr/profiles", fetcher);
    const { data: orgLocationsData } = useSWR("/api/v1/org-locations", fetcher);
    const profiles = useMemo(() => {
        const raw = ((hrProfilesData?.profiles ?? []) as HrProfileOption[]).filter((p) => p?.id && p.role_title?.trim());
        return [...raw].sort((a, b) => a.role_title.localeCompare(b.role_title, "es"));
    }, [hrProfilesData]);

    const locationNames = ((orgLocationsData?.locations ?? []) as { name: string }[]).map((l) => l.name);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            role: "operador",
            hr_profile_id: "",
            job_title: "",
            location: "",
        },
    });

    useEffect(() => {
        if (!open || inviteResult) return;
        const names = (orgLocationsData?.locations ?? []).map((l: { name: string }) => l.name);
        const first = names[0] ?? "";
        const currentLoc = form.getValues("location");
        if (first && (!currentLoc || !names.includes(currentLoc))) {
            form.setValue("location", first);
        }
    }, [open, inviteResult, orgLocationsData, form]);

    useEffect(() => {
        if (!open || inviteResult) return;
        if (profiles.length > 0) {
            const cur = form.getValues("hr_profile_id");
            const isValidProfile = profiles.some((p) => p.id === cur);
            if (cur === "" || (!isValidProfile && cur !== CUSTOM_HR)) {
                form.setValue("hr_profile_id", profiles[0].id);
                form.setValue("job_title", profiles[0].role_title);
            }
        } else {
            form.setValue("hr_profile_id", CUSTOM_HR);
        }
    }, [open, inviteResult, profiles, form]);

    function resetDialogState() {
        setSendEmail(true);
        setCopied(false);
        setInviteResult(null);
        const first = locationNames[0] ?? "";
        const defaultHr = profiles[0]?.id ?? CUSTOM_HR;
        form.reset({
            email: "",
            role: "operador",
            hr_profile_id: defaultHr,
            job_title: defaultHr === CUSTOM_HR ? "" : (profiles[0]?.role_title ?? ""),
            location: first,
        });
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
            const payload: Record<string, unknown> = {
                email: values.email,
                role: values.role,
                location: values.location,
                sendEmail,
            };

            if (values.hr_profile_id === CUSTOM_HR) {
                payload.job_title = values.job_title?.trim() ?? "";
            } else {
                payload.hr_profile_id = values.hr_profile_id;
            }

            const response = await fetch("/api/v1/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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

            const defaultSede = (orgLocationsData?.locations ?? [])[0]?.name ?? "";
            const defaultHr = profiles[0]?.id ?? CUSTOM_HR;
            form.reset({
                email: "",
                role: "operador",
                hr_profile_id: defaultHr,
                job_title: defaultHr === CUSTOM_HR ? "" : (profiles[0]?.role_title ?? ""),
                location: defaultSede,
            });
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

    const hrPick = form.watch("hr_profile_id");

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="gap-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 px-5">
                    <UserPlus className="h-4.5 w-4.5" />
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
                                <Link2 className="h-4 w-4 text-blue-400" />
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

                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                                <Link2 className="h-4 w-4" />
                                Enlace de acceso
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={inviteResult.joinUrl}
                                    className="border-zinc-800 bg-zinc-900 font-mono text-xs text-zinc-100 selection:bg-zinc-700"
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="border-zinc-800 hover:bg-zinc-800 hover:text-white"
                                    onClick={copyLink}
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-zinc-500">
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
                                className="gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copiado" : "Copiar enlace"}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            {locationNames.length === 0 && (
                                <Alert className="border-amber-500/50 bg-amber-950/20">
                                    <AlertTitle>No hay sedes en el catalogo</AlertTitle>
                                    <AlertDescription className="space-y-2">
                                        <span className="block">
                                            Agrega al menos una sede antes de invitar usuarios.
                                        </span>
                                        {canManageLocations && onOpenManageLocations && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="mt-1"
                                                onClick={() => onOpenManageLocations()}
                                            >
                                                Gestionar sedes
                                            </Button>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}
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

                            <FormField
                                control={form.control}
                                name="hr_profile_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Puesto en organigrama (RRHH)</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                if (value !== CUSTOM_HR) {
                                                    const p = profiles.find((x) => x.id === value);
                                                    if (p) form.setValue("job_title", p.role_title);
                                                }
                                            }}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                        <SelectValue placeholder="Selecciona un perfil" />
                                                    </div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={CUSTOM_HR}>Otro (texto libre)</SelectItem>
                                                {profiles.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.role_title}
                                                        {p.area ? ` (${p.area})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Si eliges un perfil del organigrama, el rol empresa quedará vinculado a ese puesto oficial.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {hrPick === CUSTOM_HR && (
                                <FormField
                                    control={form.control}
                                    name="job_title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rol empresa (manual)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Ej. Coordinador Academico"
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sede asignada</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={locationNames.length === 0}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                        <SelectValue placeholder="Selecciona una sede" />
                                                    </div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {locationNames.map((location) => (
                                                    <SelectItem key={location} value={location}>
                                                        {location}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || locationNames.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
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

