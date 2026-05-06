export type IHApplicationRecord = {
    city: string;
    proyecto: string;
    colegio: string;
    nivel: string;
    examLabel: string;
    examType: string;
    studentCount: number;
    dateIso: string | null;
    dateRaw: string;
    propuesta: string;
    estatus: string;
    resultados: string;
    rowIndex: number;
};

export type LogisticaSessionRecord = {
    sheetName: string;
    venueLabel: string;
    oralExamRaw: string;
    oralExamType: string | null;
    oralStudents: number | null;
    oralDayRaw: string;
    oralTimeRange: string;
    oralExaminers: string[];
    writtenExamRaw: string;
    writtenExamType: string | null;
    writtenStudents: number | null;
    writtenDayIso: string | null;
    writtenDayRaw: string;
    writtenTimeRange: string;
    writtenStaff: string[];
    supervisorLabels: string[];
    sourceRow: number;
};

/** Payroll block: columns Personal / Actividad / Duración / Tarifa / Subtotal (regional sheets). */
export type LogisticaPayrollLineRecord = {
    sheetName: string;
    venueLabel: string;
    sourceRow: number;
    personName: string;
    activityRaw: string;
    /** Orb / event_staff style: SE | INVIGILATOR | SUPER | ADMIN; null if unrecognized */
    roleCode: string | null;
    hours: number | null;
    /** When the "Duración" cell is a date (Excel) instead of numeric hours */
    workDateIso: string | null;
    tariff: number | null;
    subtotal: number | null;
    oralExamRaw: string | null;
    writtenExamRaw: string | null;
    oralDayRaw: string | null;
    writtenDayRaw: string | null;
};

