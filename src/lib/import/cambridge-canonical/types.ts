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
