import { Suspense } from "react";
import DocumentosClient from "./DocumentosClient";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gestión de Documentos | LEC System",
    description: "Explorador global de archivos y documentos del ERP",
};

export default function DocumentosPage() {
    return (
        <Suspense fallback={<div className="p-8">Cargando explorador...</div>}>
            <DocumentosClient />
        </Suspense>
    );
}
