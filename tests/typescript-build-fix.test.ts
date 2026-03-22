import type { MockCenniCase } from "@/lib/demo/data";
import { normalizeCenniCaseInput } from "@/lib/cenni/normalize";

const normalizedCase = normalizeCenniCaseInput({
    cliente_estudiante: "Alumno Demo",
    folio_cenni: "FOLIO-001",
});

const normalizedCases: Array<
    Omit<MockCenniCase, "id" | "org_id" | "created_at" | "updated_at" | "deleted_at">
> = [normalizedCase];

void normalizedCases;
