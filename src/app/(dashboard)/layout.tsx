import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DashboardShell } from "./dashboard-shell";

export const metadata: Metadata = {
    title: "LEC Platform — Dashboard",
    description: "Language Evaluation Center — Panel de control interno",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return <DashboardShell>{children}</DashboardShell>;
}
