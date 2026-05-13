"use client";

import useSWR from "swr";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, Calendar, FileText, UserPlus, Users, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/app/api/v1/action-center/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_CONFIG: Record<ActionItem["type"], { icon: React.ElementType; label: string }> = {
    event:  { icon: Calendar,   label: "Evento" },
    staff:  { icon: Users,      label: "Staff" },
    cenni:  { icon: FileText,   label: "CENNI" },
    crm:    { icon: UserPlus,   label: "Prospecto" },
};

const URGENCY_CONFIG: Record<ActionItem["urgency"], {
    icon: React.ElementType;
    badge: string;
    row: string;
    dot: string;
}> = {
    high:   {
        icon: AlertCircle,
        badge: "bg-red-100 text-red-700 border-red-200",
        row:   "border-l-red-500 bg-red-50/40 hover:bg-red-50/70",
        dot:   "bg-red-500",
    },
    medium: {
        icon: AlertTriangle,
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        row:   "border-l-amber-400 bg-amber-50/40 hover:bg-amber-50/70",
        dot:   "bg-amber-400",
    },
    low:    {
        icon: Info,
        badge: "bg-blue-100 text-blue-700 border-blue-200",
        row:   "border-l-blue-300 bg-blue-50/20 hover:bg-blue-50/50",
        dot:   "bg-blue-400",
    },
};

function ActionRow({ item }: { item: ActionItem }) {
    const urg = URGENCY_CONFIG[item.urgency];
    const typ = TYPE_CONFIG[item.type];
    const TypeIcon = typ.icon;

    return (
        <Link
            href={item.href}
            className={cn(
                "flex items-center gap-4 border-l-4 rounded-r-xl px-4 py-3 transition-colors",
                urg.row
            )}
        >
            <div className="shrink-0">
                <div className={cn("h-2 w-2 rounded-full", urg.dot)} />
            </div>
            <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {item.meta && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{item.meta}</span>
                )}
                <Badge variant="outline" className={cn("text-xs", urg.badge)}>
                    {typ.label}
                </Badge>
            </div>
        </Link>
    );
}

function SummaryChip({ count, label, className }: { count: number; label: string; className: string }) {
    if (count === 0) return null;
    return (
        <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold border", className)}>
            <span>{count}</span>
            <span className="font-normal opacity-80">{label}</span>
        </div>
    );
}

export default function ActionCenter() {
    const { data, isLoading, mutate } = useSWR("/api/v1/action-center", fetcher, {
        refreshInterval: 60_000,
    });

    const items: ActionItem[] = data?.items ?? [];
    const counts = data?.counts ?? { total: 0, high: 0, medium: 0, low: 0 };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header + summary chips */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <SummaryChip count={counts.high}   label="urgentes"  className="bg-red-50 border-red-200 text-red-700" />
                    <SummaryChip count={counts.medium} label="atención"  className="bg-amber-50 border-amber-200 text-amber-700" />
                    <SummaryChip count={counts.low}    label="pendientes" className="bg-blue-50 border-blue-200 text-blue-700" />
                    {counts.total === 0 && (
                        <span className="text-sm text-muted-foreground">Sin pendientes — todo al día ✓</span>
                    )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => mutate()} className="text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Actualizar
                </Button>
            </div>

            {/* Action list */}
            {items.length > 0 ? (
                <div className="space-y-2">
                    {items.map((item) => (
                        <ActionRow key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                        <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="font-semibold text-lg">Todo al día</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        No hay eventos en borrador, staff faltante, trámites CENNI urgentes ni prospectos sin seguimiento.
                    </p>
                </div>
            )}
        </div>
    );
}
