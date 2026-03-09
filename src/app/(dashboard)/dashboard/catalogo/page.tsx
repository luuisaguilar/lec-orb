"use client";

import useSWR from "swr";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BookOpen, Clock, Users } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CatalogPage() {
    const { t } = useI18n();
    const { data, isLoading } = useSWR("/api/v1/catalog", fetcher);
    const catalog = data?.catalog || [];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">{t("nav.catalog")}</h2>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : catalog.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                        <p>{t("common.noResults")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="overflow-x-auto">
                    <Card>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium">
                                            {t("calculator.exam")}
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">Código</th>
                                        <th className="px-4 py-3 text-left font-medium">Nivel</th>
                                        <th className="px-4 py-3 text-center font-medium">
                                            <div className="flex items-center justify-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {t("calculator.duration")}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium">
                                            <div className="flex items-center justify-center gap-1">
                                                <Users className="h-3.5 w-3.5" />
                                                Alumnos/Sesión
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catalog.map(
                                        (exam: {
                                            id: string;
                                            name: string;
                                            code: string;
                                            level: string | null;
                                            duration_minutes: number;
                                            students_per_session: number;
                                        }) => (
                                            <tr
                                                key={exam.id}
                                                className="border-b transition-colors hover:bg-muted/50"
                                            >
                                                <td className="px-4 py-3 font-medium">{exam.name}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="font-mono">
                                                        {exam.code}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {exam.level && (
                                                        <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                                                            {exam.level}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {exam.duration_minutes} min
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {exam.students_per_session}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
