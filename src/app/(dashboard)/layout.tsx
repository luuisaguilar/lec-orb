import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DashboardShell } from "./dashboard-shell";

export const metadata: Metadata = {
    title: "LEC Platform — Dashboard",
    description: "Languages Education Consulting — Panel de control interno",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return <DashboardShell>{children}</DashboardShell>;
}
