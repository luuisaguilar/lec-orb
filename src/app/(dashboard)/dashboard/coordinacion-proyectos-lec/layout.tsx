import type { ReactNode } from "react";
import { CoordinacionProyectosShell } from "./_components/coordinacion-proyectos-shell";

export default function CoordinacionProyectosLayout({ children }: { children: ReactNode }) {
    return (
        <div className="p-4 sm:p-6">
            <CoordinacionProyectosShell>{children}</CoordinacionProyectosShell>
        </div>
    );
}
