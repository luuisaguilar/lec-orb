"use client";

import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDropdown } from "@/components/settings-dropdown";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AppHeaderProps {
    variant: "dashboard" | "portal";
}

export function AppHeader({ variant }: AppHeaderProps) {
    const { t } = useI18n();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);



    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    }

    return (
        <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-4 pt-8">
                    <SidebarNav variant={variant} />
                </SheetContent>
            </Sheet>

            {/* Title */}
            <div className="flex-1">
                <span className="font-semibold text-primary tracking-tight hidden sm:inline-block">Languages Education Consulting</span>
                <span className="font-semibold text-primary tracking-tight sm:hidden">LEC</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <NotificationBell />
                <SettingsDropdown />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">{t("auth.logout")}</span>
                </Button>
            </div>
        </header>
    );
}
