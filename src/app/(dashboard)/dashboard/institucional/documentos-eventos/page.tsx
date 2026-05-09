import { redirect } from "next/navigation";

/** @deprecated Use `/dashboard/coordinacion-examenes/documentos-eventos` */
export default function LegacyInstitucionalDocumentosEventosRedirect() {
    redirect("/dashboard/coordinacion-examenes/documentos-eventos");
}
