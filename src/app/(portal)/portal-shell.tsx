"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/app-header";
import { SidebarNav } from "@/components/sidebar-nav";

export function PortalShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:min-h-0 lg:w-56 lg:border-r bg-card">
                <div className="flex h-14 items-center border-b px-4 gap-2">
                    <Image src="/lec_logo_pack/lec_logo_icon.png" alt="LEC Logo" width={32} height={32} className="h-8 w-auto object-contain" />
                    <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Portal
                    </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    <SidebarNav variant="portal" />
                </div>
            </aside>

            {/* Main content area */}
            <div className="flex flex-1 flex-col">
                <AppHeader variant="portal" />
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
