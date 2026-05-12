import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "./portal-shell";

export const metadata: Metadata = {
    title: "LEC Platform — Portal Aplicadores",
    description: "Languages Education Consulting — Portal para Aplicadores",
};

export default async function PortalLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/portal");
    return <PortalShell>{children}</PortalShell>;
}
