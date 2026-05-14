"use client";

import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDropdown } from "@/components/settings-dropdown";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
            {/* Mobile menu — tour anchor when desktop sidebar is hidden */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        data-tour="dashboard-sidebar-mobile"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 pt-8 overflow-hidden">
                    <SheetTitle className="sr-only">{t("header.mobileNavTitle")}</SheetTitle>
                    <div className="h-full min-h-0 overflow-y-auto px-4 pb-4">
                        <SidebarNav variant={variant} />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Title */}
            <div className="flex-1">
                <span className="font-semibold text-primary tracking-tight hidden sm:inline-block font-outfit text-lg">Languages Education Consulting</span>
                <span className="font-semibold text-primary tracking-tight sm:hidden font-outfit">LEC</span>
            </div>

            {/* Actions */}
            <div data-tour="dashboard-header-actions" className="flex items-center gap-1">
                <NotificationBell />
                <SettingsDropdown />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg transition-all duration-200 hover:bg-primary/12 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary [&_svg]:transition-transform hover:[&_svg]:scale-110"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">{t("auth.logout")}</span>
                </Button>
            </div>
        </header>
    );
}
