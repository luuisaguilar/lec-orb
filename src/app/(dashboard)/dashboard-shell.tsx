"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/app-header";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen">
            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "relative hidden lg:flex lg:flex-col lg:min-h-0 lg:border-r bg-card transition-all duration-300",
                    isCollapsed ? "lg:w-[72px]" : "lg:w-64"
                )}
            >
                <div className="flex h-14 items-center justify-center border-b relative">
                    <Image
                        src="/lec_logo_pack/lec_logo_icon.png"
                        alt="LEC Logo"
                        width={32}
                        height={32}
                        className="h-8 w-auto object-contain transition-all"
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full bg-background hidden lg:flex border"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    <span className="sr-only">Toggle Sidebar</span>
                </Button>
                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-4">
                    <SidebarNav variant="dashboard" isCollapsed={isCollapsed} />
                </div>
            </aside>

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <AppHeader variant="dashboard" />
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
