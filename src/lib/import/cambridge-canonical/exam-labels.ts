/** Normalizes IH / logística labels to event_sessions.exam_type slugs used in Orb. */
export function ihExamLabelToExamType(label: string): string | null {
    const u = label.trim().toUpperCase().replace(/\s+/g, " ");
    const map: Record<string, string> = {
        "YLE STARTERS": "starters",
        "YLE MOVERS": "movers",
        "YLE FLYERS": "flyers",
        "KEY FS": "ket",
        "PET FS": "pet",
        "FCE FS": "fce",
    };
    if (map[u]) return map[u];
    if (u === "STARTERS" || u === "MOVERS" || u === "FLYERS") {
        return u.toLowerCase();
    }
    if (u === "KEY" || u === "KET") return "ket";
    if (u === "PET") return "pet";
    if (u === "FCE") return "fce";
    return null;
}

export function logisticaOralLabelToExamType(raw: string): string | null {
    const t = raw.trim().toUpperCase();
    if (t.includes("MOVERS")) return "movers";
    if (t.includes("FLYERS")) return "flyers";
    if (t.includes("STARTERS")) return "starters";
    if (t.includes("KEY")) return "ket";
    if (t.includes("PET")) return "pet";
    if (t.includes("FCE")) return "fce";
    return ihExamLabelToExamType(raw);
}

export function getComponentOrderByExam(exam: string): { id: string }[] {
    const e = exam.toLowerCase();
    const standard = [{ id: "reading" }, { id: "writing" }, { id: "listening" }, { id: "speaking" }];
    if (["starters", "movers", "flyers", "ket"].includes(e)) {
        return [{ id: "reading_writing" }, { id: "listening" }, { id: "speaking" }];
    }
    if (e === "pet") return standard;
    if (e === "fce") {
        return [{ id: "reading_use_of_english" }, { id: "writing" }, { id: "listening" }, { id: "speaking" }];
    }
    return standard;
}
