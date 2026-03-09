"use client";

import { UserSettingsProvider } from "@/lib/contexts/settings-context";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <UserSettingsProvider>
            {children}
            <Toaster richColors position="top-right" />
        </UserSettingsProvider>
    );
}
