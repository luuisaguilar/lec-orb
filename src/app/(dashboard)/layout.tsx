import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "./dashboard-shell";

export const metadata: Metadata = {
    title: "LEC Platform — Dashboard",
    description: "Languages Education Consulting — Panel de control interno",
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/dashboard");
    return <DashboardShell>{children}</DashboardShell>;
}
