import { redirect } from "next/navigation";

/** @deprecated Ruta movida a Coordinación de exámenes */
export default function LegacyUnoiPlanningRedirect() {
    redirect("/dashboard/coordinacion-examenes/unoi-planeacion");
}
