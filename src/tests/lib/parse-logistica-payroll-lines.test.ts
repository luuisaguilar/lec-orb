import { describe, it, expect } from "vitest";
import {
    logisticaActivityToRoleCode,
    parseLogisticaPayrollLinesFromRegionalRows,
} from "@/lib/import/cambridge-canonical/parse-logistica-payroll-lines";

describe("logisticaActivityToRoleCode", () => {
    it("maps supervisor and invigilator", () => {
        expect(logisticaActivityToRoleCode("SUPER")).toBe("SUPER");
        expect(logisticaActivityToRoleCode("INVIGILATOR")).toBe("INVIGILATOR");
        expect(logisticaActivityToRoleCode("ADMIN")).toBe("ADMIN");
        expect(logisticaActivityToRoleCode("SE")).toBe("SE");
        expect(logisticaActivityToRoleCode("SE-Remoto")).toBe("SE");
    });

    it("returns null for unknown", () => {
        expect(logisticaActivityToRoleCode("")).toBeNull();
        expect(logisticaActivityToRoleCode("XYZ")).toBeNull();
    });
});

describe("parseLogisticaPayrollLinesFromRegionalRows", () => {
    it("extracts payroll block rows with context from last oral row", () => {
        const rows: string[][] = [
            ["COLEGIO TEST", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
            ["", "EVALUACIÓN ORAL", "", "", "", "", "", "EXAMEN ESCRITO", "", "", "", "", "", "", "Personal", "Actividad", "Duración", "Tarifa", "Subtotal"],
            ["Sede", "Examen", "Alumnos", "Día", "Hora", "Speaking Examiner", "", "Examen", "Alumnos", "Día", "Hora", "Personal", "", "", "", "", "", "", ""],
            [
                "HMO",
                "PET for Schools",
                "46",
                "MART 03",
                "08-10",
                "Selene M",
                "",
                "PET for Schools",
                "46",
                "SAB 07 MAR",
                "08-10",
                "Admin",
                "",
                "",
                "Argelia Reyes",
                "INVIGILATOR",
                "2",
                "$300.00",
                "$600.00",
            ],
            ["", "", "", "", "", "Other SE", "", "", "", "", "", "", "", "", "Claudia", "SE", "3", "$100.00", "$300.00"],
        ];

        const lines = parseLogisticaPayrollLinesFromRegionalRows("HMO_MAR", rows);
        expect(lines.length).toBe(2);
        expect(lines[0].personName).toBe("Argelia Reyes");
        expect(lines[0].roleCode).toBe("INVIGILATOR");
        expect(lines[0].hours).toBe(2);
        expect(lines[0].tariff).toBe(300);
        expect(lines[0].subtotal).toBe(600);
        expect(lines[0].oralExamRaw).toBe("PET for Schools");
        expect(lines[0].writtenExamRaw).toBe("PET for Schools");

        expect(lines[1].personName).toBe("Claudia");
        expect(lines[1].roleCode).toBe("SE");
        expect(lines[1].hours).toBe(3);
    });
});
