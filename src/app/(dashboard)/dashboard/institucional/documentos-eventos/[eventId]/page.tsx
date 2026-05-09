import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ eventId: string }>;
}

/** @deprecated Use `/dashboard/coordinacion-examenes/documentos-eventos/[eventId]` */
export default async function LegacyInstitucionalDocumentosEventoDetailRedirect({ params }: PageProps) {
    const { eventId } = await params;
    redirect(`/dashboard/coordinacion-examenes/documentos-eventos/${eventId}`);
}
