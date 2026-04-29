"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, AlertCircle } from "lucide-react";

function fmt(n: number) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

interface RegionData {
    executed: number;
    paid: number;
    balance: number;
    future: number;
    sessionCount: number;
    pendingCount: number;
}

interface Props {
    data?: RegionData;
    loading: boolean;
}

export function IhSummaryCards({ data, loading }: Props) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}><CardContent className="pt-6"><div className="h-14 w-full animate-pulse rounded bg-muted" /></CardContent></Card>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: "Ejecutado",
            value: fmt(data?.executed ?? 0),
            sub: `${data?.sessionCount ?? 0} sesiones`,
            icon: TrendingUp,
            color: "text-blue-600",
        },
        {
            label: "Pagado por IH",
            value: fmt(data?.paid ?? 0),
            sub: `${Math.round(((data?.paid ?? 0) / Math.max(data?.executed ?? 1, 1)) * 100)}% del ejecutado`,
            icon: DollarSign,
            color: "text-green-600",
        },
        {
            label: "Saldo Pendiente",
            value: fmt(data?.balance ?? 0),
            sub: `${data?.pendingCount ?? 0} sesiones sin pago`,
            icon: AlertCircle,
            color: (data?.balance ?? 0) > 0 ? "text-red-600" : "text-green-600",
        },
        {
            label: "Por Ejecutar",
            value: fmt(data?.future ?? 0),
            sub: "sesiones futuras",
            icon: Clock,
            color: "text-amber-600",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {cards.map(c => (
                <Card key={c.label}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                        <c.icon className={`h-4 w-4 ${c.color}`} />
                    </CardHeader>
                    <CardContent>
                        <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
