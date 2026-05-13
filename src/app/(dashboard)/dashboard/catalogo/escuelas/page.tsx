import { redirect } from "next/navigation";

/** Compatibilidad: rutas antiguas bajo /catalogo/escuelas. */
export default function CatalogoEscuelasLegacyRedirect() {
    redirect("/dashboard/schools");
}
