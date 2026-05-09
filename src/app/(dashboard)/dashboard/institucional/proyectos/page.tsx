import { redirect } from "next/navigation";

/** @deprecated Use `/dashboard/coordinacion-examenes/proyectos` */
export default function LegacyInstitucionalProyectosRedirect() {
    redirect("/dashboard/coordinacion-examenes/proyectos");
}
