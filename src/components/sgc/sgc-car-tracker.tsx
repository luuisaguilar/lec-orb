"use client";

import React from "react";
import useSWR from "swr";
import {
    ShieldAlert,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Loader2,
    Calendar,
    User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AuditCar {
    id: string;
    car_code: string;
    finding_title: string;
    description: string;
    status: "open" | "in_progress" | "closed";
    owner_name: string | null;
    due_date: string | null;
    updated_at: string;
}

export default function SGCCarTracker() {
    const { data, error, isLoading } = useSWR("/api/v1/sgc/audit", fetcher);

    if (isLoading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    const cars: AuditCar[] = data?.cars ?? [];
    const openCars = cars.filter(c => c.status !== "closed");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-rose-500" />
                        Corrective Action Requests (CAR)
                    </h3>
                    <p className="text-sm text-slate-400">Seguimiento de hallazgos críticos de auditoría.</p>
                </div>
                <Badge variant="outline" className="bg-slate-900 border-slate-800 text-slate-400">
                    {openCars.length} Pendientes
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cars.slice(0, 6).map((car) => (
                    <Card key={car.id} className="bg-slate-900/40 border-slate-800/60 hover:border-primary/30 transition-all group">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-start justify-between gap-2">
                                <Badge variant="outline" className="font-mono text-[10px] border-slate-700 text-primary bg-slate-950/50">
                                    {car.car_code}
                                </Badge>
                                <Badge className={cn(
                                    "text-[9px] border-none px-1.5 h-4",
                                    car.status === "open" ? "bg-rose-500/10 text-rose-400" :
                                    car.status === "in_progress" ? "bg-amber-500/10 text-amber-400" :
                                    "bg-emerald-500/10 text-emerald-400"
                                )}>
                                    {car.status === "open" ? "Abierta" : car.status === "in_progress" ? "En curso" : "Cerrada"}
                                </Badge>
                            </div>
                            <CardTitle className="text-sm font-semibold text-white mt-2 group-hover:text-primary transition-colors line-clamp-1">
                                {car.finding_title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed h-8">
                                {car.description}
                            </p>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <User className="h-3 w-3" />
                                        <span className="truncate max-w-[80px]">{car.owner_name || "Sin asignar"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <Calendar className="h-3 w-3" />
                                        <span>{car.due_date ? new Date(car.due_date).toLocaleDateString() : "S/F"}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {cars.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                        <CheckCircle2 className="h-8 w-8 text-slate-700 mb-2 opacity-20" />
                        <p className="text-sm text-slate-500">No hay hallazgos registrados.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
