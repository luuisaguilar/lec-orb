"use client";

import { useState } from "react";
import useSWR from "swr";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    School,
    Plus,
    Search,
    MapPin,
    Phone,
    Mail,
    Loader2,
    Building2,
    Trash2,
    Pencil,
    User,
} from "lucide-react";
import { toast } from "sonner";
import { AddSchoolDialog } from "@/components/schools/add-school-dialog";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SchoolsDashboard() {
    const { t } = useI18n();
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editingSchool, setEditingSchool] = useState<any>(null);

    const { data, isLoading, mutate } = useSWR("/api/v1/schools", fetcher);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar este colegio/sede: ${name}?`)) return;
        try {
            const res = await fetch(`/api/v1/schools/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Colegio eliminado");
                mutate();
            } else {
                toast.error("Error al eliminar colegio");
            }
        } catch {
            toast.error("Error de conexión");
        }
    };

    const allSchools = data?.schools || [];
    const schools = search
        ? allSchools.filter((s: { name: string; address: string | null }) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.address?.toLowerCase().includes(search.toLowerCase()))
        )
        : allSchools;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold tracking-tight">{t("schools.title")}</h2>
                <Button onClick={() => setShowAdd(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("common.create")}
                </Button>
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

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : schools.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <School className="h-12 w-12 mb-4 opacity-50" />
                        <p>{t("common.noResults")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {schools.map(
                        (school: {
                            id: string;
                            name: string;
                            address: string | null;
                            city: string | null;
                            contact_name: string | null;
                            contact_phone: string | null;
                            contact_email: string | null;
                            notes: string | null;
                            levels: string[];
                            rooms: any[];
                        }) => (
                            <Card key={school.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3 border-b mb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Building2 className="h-5 w-5 text-blue-500" />
                                            {school.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingSchool(school)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(school.id, school.name)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    {school.levels && school.levels.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {school.levels.map(lvl => (
                                                <Badge key={lvl} variant="secondary" className="text-[10px] tracking-wide uppercase px-1.5 py-0">{lvl}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    {(school.address || school.city) && (
                                        <div className="flex items-start gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>
                                                {school.address}
                                                {school.address && school.city ? ", " : ""}
                                                {school.city}
                                            </span>
                                        </div>
                                    )}
                                    {school.contact_name && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <User className="h-4 w-4 shrink-0" />
                                            <span>{school.contact_name}</span>
                                        </div>
                                    )}
                                    {school.contact_phone && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-4 w-4 shrink-0" />
                                            <span>{school.contact_phone}</span>
                                        </div>
                                    )}
                                    {school.contact_email && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-4 w-4 shrink-0" />
                                            <span>{school.contact_email}</span>
                                        </div>
                                    )}

                                    {school.rooms && school.rooms.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                            <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                                                Sede de Aplicación
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 w-fit px-2 py-1 rounded-md">
                                                <Building2 className="w-3.5 h-3.5" />
                                                <span>{school.rooms.length} {school.rooms.length === 1 ? 'Salón' : 'Salones'} configurados</span>
                                            </div>
                                        </div>
                                    )}

                                    {school.notes && (
                                        <p className="text-xs text-muted-foreground italic mt-3 border-t pt-2">
                                            {school.notes}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    )}
                </div>
            )}

            <AddSchoolDialog
                open={showAdd || !!editingSchool}
                onOpenChange={(v) => {
                    if (!v) {
                        setShowAdd(false);
                        setEditingSchool(null);
                    }
                }}
                initialData={editingSchool}
                onSuccess={() => { mutate(); setShowAdd(false); setEditingSchool(null); }}
            />
        </div>
    );
}
