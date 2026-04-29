"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

function fmt(n: number) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

interface Alert {
    school: string;
    balance: number;
    weeksOverdue: number;
}

export function IhAlertsCard({ alerts }: { alerts: Alert[] }) {
    return (
        <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-700 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Alertas de Cobro
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2">
                    {alerts.map(a => (
                        <div key={a.school} className="flex items-center justify-between rounded-md border border-red-200 bg-white px-3 py-2">
                            <div>
                                <p className="text-sm font-medium">{a.school}</p>
                                <p className="text-xs text-muted-foreground">
                                    {a.weeksOverdue > 0 ? `${a.weeksOverdue} sem. vencido` : "Pendiente"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-red-700">{fmt(a.balance)}</span>
                                {a.weeksOverdue >= 4 && (
                                    <Badge variant="destructive" className="text-xs">Urgente</Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
