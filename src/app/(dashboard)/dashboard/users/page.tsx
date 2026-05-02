"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Mail, ShieldAlert, Trash2, CheckCircle2, Loader2, RefreshCw, Settings2, Eye, EyeOff } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

import { InviteUserDialog } from "./invite-user-dialog";
import { EditUserDialog } from "@/components/users/edit-user-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface OrgMember {
    id: string;
    user_id: string;
    role: string;
    location: string | null;
    job_title?: string | null;
    created_at: string;
    full_name: string;
    email: string;
}

interface OrgInvitation {
    id: string;
    email: string;
    role: string;
    status: "pending" | "accepted" | "expired" | "revoked";
    created_at: string;
}

export default function UsersPage() {
    const { data: membersData, mutate: mutateMembers, isLoading: loadingMembers } = useSWR("/api/v1/users", fetcher);
    const { data: invitationsData, mutate: mutateInvites, isLoading: loadingInvites } = useSWR("/api/v1/invitations", fetcher);

    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
    const [showAllInvites, setShowAllInvites] = useState(false);
    const [cleaningUp, setCleaningUp] = useState(false);

    const members: OrgMember[] = membersData?.members || [];
    const invitations: OrgInvitation[] = invitationsData?.invitations || [];

    const handleRevokeInvite = async (id: string, email: string) => {
        try {
            const res = await fetch(`/api/v1/invitations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "revoked" }),
            });

            if (!res.ok) throw new Error();

            toast.success("Invitación revocada", {
                description: `Se revocó el acceso para ${email}.`,
            });
            mutateInvites();
        } catch {
            toast.error("No se pudo revocar la invitación");
        }
    };

    const handleResendInvite = async (id: string, email: string) => {
        setResendingInviteId(id);

        try {
            const res = await fetch(`/api/v1/invitations/${id}/resend`, {
                method: "POST",
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "No se pudo reenviar la invitacion.");
            }

            if (data.emailSent) {
                toast.success("Invitacion reenviada", {
                    description: `Se envio un nuevo correo a ${email}.`,
                });
            } else if (data.joinUrl) {
                try {
                    await navigator.clipboard.writeText(data.joinUrl);
                    toast.warning("No se pudo enviar el email", {
                        description: "El enlace activo se copio al portapapeles para compartirlo manualmente.",
                    });
                } catch {
                    toast.warning("No se pudo enviar el email", {
                        description: "La invitacion sigue activa, pero deberas compartir el enlace manualmente.",
                    });
                }
            } else {
                toast.warning("No se pudo enviar el email");
            }
        } catch (error: unknown) {
            toast.error("No se pudo reenviar la invitacion", {
                description: error instanceof Error ? error.message : undefined,
            });
        } finally {
            setResendingInviteId(null);
        }
    };

    const handleRemoveMember = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro que deseas remover a ${name}?`)) return;

        try {
            const res = await fetch(`/api/v1/users?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();

            toast.success("Usuario removido");
            mutateMembers();
        } catch {
            toast.error("Error al remover usuario. Verifica que tengas permisos de administrador.");
        }
    };

    const handleCleanupHistory = async () => {
        if (!confirm("¿Eliminar permanentemente todas las invitaciones revocadas, aceptadas y expiradas? Las pendientes no se afectan.")) return;
        setCleaningUp(true);
        try {
            const res = await fetch("/api/v1/invitations/cleanup", { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Error");
            toast.success(`Historial limpiado`, { description: `Se eliminaron ${data.deleted} invitaciones del historial.` });
            mutateInvites();
        } catch (e: unknown) {
            toast.error("No se pudo limpiar el historial", { description: e instanceof Error ? e.message : undefined });
        } finally {
            setCleaningUp(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <EditUserDialog
                memberId={selectedMemberId}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={() => mutateMembers()}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 border-b">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight text-white font-outfit">
                        Usuarios y <span className="text-primary italic">Accesos</span>
                    </h2>
                    <p className="text-muted-foreground font-semibold">
                        Administración centralizada de miembros y matriz de permisos.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => { mutateMembers(); mutateInvites(); }}>
                        <RefreshCw className={`h-4 w-4 ${(loadingMembers || loadingInvites) ? 'animate-spin' : ''}`} />
                    </Button>
                    <InviteUserDialog onInviteSuccess={() => mutateInvites()} />
                </div>
            </div>

            <Tabs defaultValue="active" className="space-y-4">
                <TabsList className="bg-muted/50 border">
                    <TabsTrigger value="active" className="data-[state=active]:bg-[#002e5d] data-[state=active]:text-white">
                        Usuarios Activos
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="relative data-[state=active]:bg-[#002e5d] data-[state=active]:text-white">
                        Invitaciones
                        {invitations.filter((i) => i.status === "pending").length > 0 && (
                            <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                                {invitations.filter((i) => i.status === "pending").length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                    <Card className="shadow-sm border-t-4 border-t-[#002e5d]">
                        <CardHeader>
                            <CardTitle>Miembros de la Organización</CardTitle>
                            <CardDescription>
                                Lista de usuarios con acceso activo a la plataforma y sus respectivos roles asignados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingMembers ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[300px]">Usuario</TableHead>
                                            <TableHead>Rol Asignado</TableHead>
                                            <TableHead>Rol Empresa</TableHead>
                                            <TableHead>Sede Asignada</TableHead>
                                            <TableHead>Fecha de Ingreso</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.map((member) => (
                                            <TableRow key={member.id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 border">
                                                            <AvatarImage src={`https://avatar.vercel.sh/${member.user_id}`} alt={member.full_name} />
                                                            <AvatarFallback>{member.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-[#002e5d]">{member.full_name}</span>
                                                            <span className="text-xs text-muted-foreground">{member.email}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            member.role === "admin"
                                                                ? "bg-[#002e5d]/10 text-[#002e5d] border-[#002e5d]/20 uppercase text-[10px]"
                                                                : member.role === "supervisor"
                                                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 uppercase text-[10px]"
                                                                    : "uppercase text-[10px]"
                                                        }
                                                    >
                                                        {member.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                        {member.job_title || "No definido"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium text-[#002e5d]">
                                                        {member.location || "N/A"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {format(new Date(member.created_at), "d MMM yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-[#002e5d] hover:bg-slate-100"
                                                            onClick={() => {
                                                                setSelectedMemberId(member.id);
                                                                setEditDialogOpen(true);
                                                            }}
                                                        >
                                                            <Settings2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleRemoveMember(member.id, member.full_name)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                    <Card className="shadow-sm border-t-4 border-t-[#002e5d]">
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <CardTitle>Invitaciones Enviadas</CardTitle>
                                    <CardDescription>
                                        Administra las invitaciones pendientes y revoca envíos no deseados.
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-xs"
                                        onClick={() => setShowAllInvites((v) => !v)}
                                    >
                                        {showAllInvites ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        {showAllInvites ? "Ocultar historial" : "Ver historial"}
                                    </Button>
                                    {invitations.some((i) => i.status !== "pending") && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                                            disabled={cleaningUp}
                                            onClick={handleCleanupHistory}
                                        >
                                            {cleaningUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                            Limpiar historial
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingInvites ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                            ) : invitations.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                    No hay invitaciones enviadas en este momento.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[280px]">Correo Electrónico</TableHead>
                                            <TableHead>Rol Propuesto</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Enviado el</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invitations.filter((inv) => showAllInvites || inv.status === "pending").map((inv) => (
                                            <TableRow key={inv.id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                        {inv.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="uppercase text-[10px]">
                                                        {inv.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {inv.status === "pending" && (
                                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                            Pendiente
                                                        </Badge>
                                                    )}
                                                    {inv.status === "accepted" && (
                                                        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                                                            <CheckCircle2 className="h-3 w-3" /> Aceptada
                                                        </Badge>
                                                    )}
                                                    {inv.status === "expired" && (
                                                        <Badge variant="outline" className="text-muted-foreground">Expirada</Badge>
                                                    )}
                                                    {inv.status === "revoked" && (
                                                        <Badge variant="destructive" className="bg-red-100 text-red-600 border-none">Revocada</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {format(new Date(inv.created_at), "d MMM yyyy", { locale: es })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {inv.status === "pending" && (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="px-3 font-bold text-[#002e5d] hover:bg-slate-100"
                                                                disabled={resendingInviteId === inv.id}
                                                                onClick={() => handleResendInvite(inv.id, inv.email)}
                                                            >
                                                                {resendingInviteId === inv.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Mail className="h-4 w-4" />
                                                                )}
                                                                Reenviar
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold px-3"
                                                                onClick={() => handleRevokeInvite(inv.id, inv.email)}
                                                            >
                                                                <ShieldAlert className="h-4 w-4 mr-2" />
                                                                Revocar
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
