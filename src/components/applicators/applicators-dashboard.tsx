"use client";

import { useState } from "react";
import useSWR from "swr";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    UserCircle,
    Plus,
    Search,
    Mail,
    Phone,
    MapPin,
    CalendarDays,
    Trash2,
    Pencil,
    DollarSign,
    Loader2,
    FileSpreadsheet,
    KeyRound,
} from "lucide-react";

import { AddApplicatorDialog } from "@/components/applicators/add-applicator-dialog";
import { ApplicatorImportDialog } from "@/components/applicators/applicators-import-dialog";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ApplicatorsDashboard() {
    const { t } = useI18n();
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editingApp, setEditingApp] = useState<any>(null);
    const [invitingId, setInvitingId] = useState<string | null>(null);

    const { data, isLoading, mutate } = useSWR("/api/v1/applicators", fetcher);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al aplicador: ${name}?`)) return;
        try {
            const res = await fetch(`/api/v1/applicators/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Aplicador eliminado");
                mutate();
            } else {
                toast.error("Error al eliminar aplicador");
            }
        } catch {
            toast.error("Error de conexión");
        }
    };

    const sendPortalInvite = async (id: string) => {
        setInvitingId(id);
        try {
            const res = await fetch(`/api/v1/applicators/${id}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sendEmail: true }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(typeof data?.error === "string" ? data.error : "No se pudo crear la invitación");
                return;
            }
            toast.success(data.emailSent ? "Invitación enviada por correo." : "Invitación creada.");
            if (data.joinUrl && typeof navigator?.clipboard?.writeText === "function") {
                await navigator.clipboard.writeText(data.joinUrl);
                toast.message("Enlace copiado al portapapeles");
            }
            mutate();
        } catch {
            toast.error("Error de conexión");
        } finally {
            setInvitingId(null);
        }
    };

    const allApplicators = data?.applicators || [];

    const [zoneFilter, setZoneFilter] = useState<string>("all");

    const applicators = allApplicators.filter((a: any) => {
        const matchesSearch =
            !search ||
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.email?.toLowerCase().includes(search.toLowerCase());
        const matchesZone =
            zoneFilter === "all" ||
            (zoneFilter === "none" ? !a.location_zone : a.location_zone === zoneFilter);
        return matchesSearch && matchesZone;
    });

    const ZONE_TABS = [
        { value: "all", label: "Todas", count: allApplicators.length },
        { value: "Hermosillo", label: "Hermosillo", count: allApplicators.filter((a: any) => a.location_zone === "Hermosillo").length },
        { value: "Obregón", label: "Cd. Obregón", count: allApplicators.filter((a: any) => a.location_zone === "Obregón").length },
        { value: "Baja California", label: "Baja California", count: allApplicators.filter((a: any) => a.location_zone === "Baja California").length },
        { value: "none", label: "Sin Sede", count: allApplicators.filter((a: any) => !a.location_zone).length },
    ];

    const ZONE_COLORS: Record<string, string> = {
        "Hermosillo": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
        "Obregón": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        "Baja California": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold tracking-tight">{t("applicators.title")}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setShowImport(true)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Importar (Excel)
                    </Button>
                    <Button onClick={() => setShowAdd(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("common.create")}
                    </Button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder={t("common.search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {ZONE_TABS.map(tab => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => setZoneFilter(tab.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                            ${zoneFilter === tab.value
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                            }`}
                    >
                        {tab.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                            ${zoneFilter === tab.value ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : applicators.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <UserCircle className="h-12 w-12 mb-4 opacity-50" />
                        <p>{t("common.noResults")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {applicators.map(
                        (app: {
                            id: string;
                            external_id: string | null;
                            name: string;
                            birth_date: string | null;
                            city: string | null;
                            location_zone: string | null;
                            email: string | null;
                            phone: string | null;
                            rate_per_hour: number | null;
                            roles: string[];
                            certified_levels: string[];
                            authorized_exams: string[];
                            notes: string | null;
                            auth_user_id?: string | null;
                        }) => (
                            <Card key={app.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
                                <CardHeader className="pb-3 border-b border-border/50 mb-3 flex-none">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <UserCircle className="h-5 w-5 text-violet-500 shrink-0" />
                                                <span className="break-words">{app.name}</span>
                                            </CardTitle>
                                            <div className="flex items-center gap-1.5 ml-auto shrink-0 flex-wrap justify-end">
                                                {app.auth_user_id && (
                                                    <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                        Portal
                                                    </Badge>
                                                )}
                                                {app.external_id && (
                                                    <Badge variant="outline" className="text-[10px] font-mono">
                                                        ID: {app.external_id}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                                        {app.location_zone && (
                                            <Badge className={`text-[10px] font-semibold px-2 py-0.5 ${ZONE_COLORS[app.location_zone] || 'bg-muted text-muted-foreground'}`}>
                                                <MapPin className="h-3 w-3 mr-1" />{app.location_zone}
                                            </Badge>
                                        )}
                                        {app.city && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                <span className="truncate max-w-[120px]">{app.city}</span>
                                            </div>
                                        )}
                                        {app.birth_date && (
                                            <div className="flex items-center gap-1">
                                                <CalendarDays className="h-3 w-3" />
                                                <span>{new Date(app.birth_date + 'T12:00:00Z').toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col flex-1 text-sm">
                                    <div className="flex flex-wrap gap-2 focus:outline-none mb-4 justify-center">
                                        {app.authorized_exams?.length > 0 ? (
                                            app.authorized_exams.map((exam: string) => (
                                                <Badge
                                                    key={exam}
                                                    className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 font-semibold"
                                                >
                                                    {exam}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground italic">Logística / Sin Exámenes</span>
                                        )}
                                    </div>
                                    {app.certified_levels?.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {app.certified_levels.map((level: string) => (
                                                <Badge
                                                    key={level}
                                                    className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                                >
                                                    {level}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <div className="space-y-1 text-muted-foreground mb-4">
                                        {app.rate_per_hour && (
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-3.5 w-3.5" />
                                                <span className="text-sm">${app.rate_per_hour}/hr</span>
                                            </div>
                                        )}
                                    </div>
                                    {app.notes && (
                                        <p className="text-xs text-muted-foreground italic border-t pt-2 mb-4">
                                            {app.notes}
                                        </p>
                                    )}
                                    <div className="flex items-end justify-between gap-2 mt-auto pt-4 border-t border-border/50">
                                        <div className="flex flex-col gap-1.5 text-muted-foreground min-w-0 flex-1">
                                            {app.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="text-xs truncate" title={app.email}>{app.email}</span>
                                                </div>
                                            )}
                                            {app.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="text-xs">{app.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {app.email && !app.auth_user_id && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    title="Invitar al portal"
                                                    disabled={invitingId === app.id}
                                                    onClick={() => sendPortalInvite(app.id)}
                                                >
                                                    {invitingId === app.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <KeyRound className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setEditingApp(app)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(app.id, app.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    )}
                </div>
            )}

            <AddApplicatorDialog
                open={showAdd || !!editingApp}
                onOpenChange={(v) => {
                    if (!v) {
                        setShowAdd(false);
                        setEditingApp(null);
                    }
                }}
                initialData={editingApp}
                onSuccess={() => { mutate(); setShowAdd(false); setEditingApp(null); }}
            />

            <ApplicatorImportDialog
                open={showImport}
                onOpenChange={setShowImport}
                onSuccess={() => { mutate(); setShowImport(false); }}
            />
        </div>
    );
}
