export type CenniCaseInput = {
    folio_cenni: string;
    cliente_estudiante: string;
    celular?: string | null;
    correo?: string | null;
    solicitud_cenni?: boolean;
    acta_o_curp?: boolean;
    id_documento?: boolean;
    certificado?: string | null;
    datos_curp?: string | null;
    cliente?: string | null;
    estatus?: string;
    estatus_certificado?: string | null;
    notes?: string | null;
};

export type NormalizedCenniCaseInput = {
    folio_cenni: string;
    cliente_estudiante: string;
    celular: string | null;
    correo: string | null;
    solicitud_cenni: boolean;
    acta_o_curp: boolean;
    id_documento: boolean;
    certificado: string | null;
    datos_curp: string | null;
    cliente: string | null;
    estatus: string;
    estatus_certificado: string | null;
    notes: string | null;
};

type NormalizeCenniCaseOptions = {
    defaultStatus?: string;
    defaultNotes?: string | null;
};

function normalizeNullableText(value: string | null | undefined): string | null {
    return value ?? null;
}

export function normalizeCenniCaseInput(
    input: CenniCaseInput,
    options: NormalizeCenniCaseOptions = {}
): NormalizedCenniCaseInput {
    return {
        folio_cenni: input.folio_cenni,
        cliente_estudiante: input.cliente_estudiante,
        celular: normalizeNullableText(input.celular),
        correo: normalizeNullableText(input.correo),
        solicitud_cenni: input.solicitud_cenni ?? false,
        acta_o_curp: input.acta_o_curp ?? false,
        id_documento: input.id_documento ?? false,
        certificado: normalizeNullableText(input.certificado),
        datos_curp: normalizeNullableText(input.datos_curp),
        cliente: normalizeNullableText(input.cliente),
        estatus: input.estatus ?? options.defaultStatus ?? "SOLICITADO",
        estatus_certificado: normalizeNullableText(input.estatus_certificado),
        notes: normalizeNullableText(input.notes) ?? options.defaultNotes ?? null,
    };
}
