"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Notification {
    id: string;
    type: "info" | "warning" | "success" | "action_required";
    title: string;
    body?: string;
    link?: string;
    module_slug?: string;
    is_read: boolean;
    created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
    info: "bg-blue-500",
    warning: "bg-amber-500",
    success: "bg-emerald-500",
    action_required: "bg-red-500",
};

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "ahora";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const { data, mutate } = useSWR("/api/v1/notifications?limit=15", fetcher, {
        refreshInterval: 30000, // Poll every 30s
    });

    const notifications: Notification[] = data?.notifications ?? [];
    const unreadCount: number = data?.unread_count ?? 0;

    // Realtime subscription for instant updates
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`notifications-${Math.random()}`) // Unique channel name per tab
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "notifications" },
                () => { mutate(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [mutate]);

    const markAsRead = useCallback(async (ids: string[]) => {
        await fetch("/api/v1/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
        });
        mutate();
    }, [mutate]);

    const markAllRead = useCallback(async () => {
        await fetch("/api/v1/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mark_all: true }),
        });
        mutate();
    }, [mutate]);

    const handleClick = (notif: Notification) => {
        if (!notif.is_read) markAsRead([notif.id]);
        if (notif.link) {
            setOpen(false);
            router.push(notif.link);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notificaciones</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <span className="font-semibold text-sm">Notificaciones</span>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Marcar todas
                        </Button>
                    )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                        <div className="flex flex-col items-center py-8 text-center">
                            <Bell className="h-6 w-6 text-muted-foreground mb-1" />
                            <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                        </div>
                    )}
                    {notifications.map((notif) => (
                        <button
                            key={notif.id}
                            onClick={() => handleClick(notif)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${!notif.is_read ? "bg-primary/5" : ""
                                }`}
                        >
                            {/* Dot */}
                            <div className="mt-1.5 shrink-0">
                                {!notif.is_read ? (
                                    <div className={`h-2 w-2 rounded-full ${TYPE_COLORS[notif.type] ?? TYPE_COLORS.info}`} />
                                ) : (
                                    <div className="h-2 w-2" />
                                )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-tight ${!notif.is_read ? "font-medium" : "text-muted-foreground"}`}>
                                    {notif.title}
                                </p>
                                {notif.body && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                                )}
                                <span className="text-xs text-muted-foreground mt-1 block">
                                    {timeAgo(notif.created_at)}
                                </span>
                            </div>
                            {/* Link indicator */}
                            {notif.link && (
                                <ExternalLink className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
