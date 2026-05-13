import { redirect } from "next/navigation";

/** Compatibilidad: rutas antiguas bajo /catalogo/applicadores. */
export default function CatalogoApplicadoresLegacyRedirect() {
    redirect("/dashboard/applicators");
}
