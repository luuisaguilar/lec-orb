import type { ReactNode } from "react";
import type { Metadata } from "next";
import { PortalShell } from "./portal-shell";

export const metadata: Metadata = {
    title: "LEC Platform — Portal Aplicadores",
    description: "Languages Education Consulting — Portal para Aplicadores",
};

export default function PortalLayout({ children }: { children: ReactNode }) {
    return <PortalShell>{children}</PortalShell>;
}
