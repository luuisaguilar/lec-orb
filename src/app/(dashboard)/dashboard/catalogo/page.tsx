import { redirect } from "next/navigation";

/** Raíz del módulo catálogo: mismo destino que el ítem “Catálogo de conceptos” en Directorio. */
export default function CatalogoPage() {
    redirect("/dashboard/catalogo/conceptos");
}
