import type { ReactNode } from "react";
import { CoordinacionProyectosShell } from "./_components/coordinacion-proyectos-shell";

export default function CoordinacionProyectosLayout({ children }: { children: ReactNode }) {
    return <CoordinacionProyectosShell>{children}</CoordinacionProyectosShell>;
}
