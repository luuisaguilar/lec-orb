// =============================================================================
// EXAM UTILITIES — Central module for exam-related types, constants & helpers
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Exam {
    id: string;
    name: string;
}

export interface ExamComponent {
    id: string;
    name: string;
}

export interface Applicator {
    id: string;
    name: string;
    external_id?: string | null;
    birth_date?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
    rate_per_hour?: number | null;
    authorized_exams: string[];
    certified_levels?: string[];
    roles?: string[];
    notes?: string | null;
}

// ---------------------------------------------------------------------------
// Constants — canonical exam list
// ---------------------------------------------------------------------------

export const EXAMS: Exam[] = [
    { id: "starters", name: "Starters" },
    { id: "movers", name: "Movers" },
    { id: "flyers", name: "Flyers" },
    { id: "ket", name: "Key (KET)" },
    { id: "pet", name: "Preliminary (PET)" },
    { id: "fce", name: "First (FCE)" },
];

/**
 * Cambridge-canonical storage value for each exam.
 * These are the strings stored in `authorized_exams` when using the manual form.
 */
export const EXAM_STORAGE_VALUES: Record<string, string> = {
    starters: "YLE STARTERS",
    movers: "YLE MOVERS",
    flyers: "YLE FLYERS",
    ket: "KET",
    pet: "PET",
    fce: "FCE",
};

// ---------------------------------------------------------------------------
// Drag-and-drop components per exam type
// ---------------------------------------------------------------------------

export const EXAM_COMPONENTS: Record<string, ExamComponent[]> = {
    starters: [
        { id: "listening", name: "Listening" },
        { id: "reading_writing", name: "Reading & Writing" },
        { id: "speaking", name: "Speaking (Evaluación Oral)" },
    ],
    movers: [
        { id: "listening", name: "Listening" },
        { id: "reading_writing", name: "Reading & Writing" },
        { id: "speaking", name: "Speaking (Evaluación Oral)" },
    ],
    flyers: [
        { id: "listening", name: "Listening" },
        { id: "reading_writing", name: "Reading & Writing" },
        { id: "speaking", name: "Speaking (Evaluación Oral)" },
    ],
    ket: [
        { id: "reading_writing", name: "Reading & Writing" },
        { id: "listening", name: "Listening" },
        { id: "speaking", name: "Speaking (Evaluación Oral)" },
    ],
    pet: [
        { id: "reading_writing", name: "Reading & Writing" },
        { id: "listening", name: "Listening" },
        { id: "speaking", name: "Speaking (Evaluación Oral)" },
    ],
    fce: [
        { id: "reading_use_of_english", name: "Reading & Use of English" },
        { id: "writing", name: "Writing" },
        { id: "listening", name: "Listening" },
        { id: "speaking", name: "Speaking (Evaluación Oral)" },
    ],
};

/** Fallback component list when no exam-specific list exists. */
export const DEFAULT_COMPONENTS: ExamComponent[] = [
    { id: "reading", name: "Reading / Use of English" },
    { id: "writing", name: "Writing" },
    { id: "listening", name: "Listening" },
    { id: "speaking", name: "Speaking (Evaluación Oral)" },
];

export const getComponentsForExam = (examId: string): ExamComponent[] =>
    EXAM_COMPONENTS[examId?.toLowerCase()] || DEFAULT_COMPONENTS;

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Maps common Excel/CSV exam name variants to the canonical storage value.
 * Use this when importing applicators from Excel so all values are consistent.
 *
 * @param raw  Raw string from the spreadsheet (e.g. "YLE", "starters", "KET")
 * @returns    Canonical storage string (e.g. "YLE STARTERS") or trimmed-uppercase raw value.
 */
export function normalizeExamName(raw: string): string {
    const s = raw.trim().toLowerCase();

    // YLE Starters
    if (s === "yle starters" || s === "starters" || s === "yle starter") return "YLE STARTERS";
    // YLE Movers
    if (s === "yle movers" || s === "movers" || s === "yle mover") return "YLE MOVERS";
    // YLE Flyers
    if (s === "yle flyers" || s === "flyers" || s === "yle flyer") return "YLE FLYERS";
    // Generic YLE (keep as-is — isCertifiedForExam will handle it)
    if (s === "yle") return "YLE";
    // KET
    if (s === "ket" || s === "key" || s === "key for schools" || s === "a2 key") return "KET";
    // PET
    if (s === "pet" || s === "preliminary" || s === "b1 preliminary") return "PET";
    // FCE
    if (s === "fce" || s === "first" || s === "first certificate" || s === "b2 first") return "FCE";

    // Unknown — return uppercased trimmed version
    return raw.trim().toUpperCase();
}

// ---------------------------------------------------------------------------
// Certification check
// ---------------------------------------------------------------------------

/**
 * Checks whether an applicator is certified to administer a given exam.
 *
 * Handles many storage formats for `authorized_exams` / `certified_levels`:
 * - "YLE STARTERS", "YLE MOVERS", "YLE FLYERS"
 * - "YLE" generic (matches all young-learner exams)
 * - "KET", "KEY", "PET", "PRELIMINARY", "FCE", "FIRST"
 * - Exam IDs like "starters", "ket"
 *
 * @param app     Applicator object with `authorized_exams` or `certified_levels`.
 * @param examId  Lowercase exam ID from the form (e.g. "starters", "ket").
 */
export function isCertifiedForExam(app: Pick<Applicator, "authorized_exams" | "certified_levels"> | any, examId: string): boolean {
    if (!examId) return true;
    const target = examId.toLowerCase().trim();
    const levels: string[] = app.authorized_exams || app.certified_levels || [];
    if (levels.length === 0) return false;

    return levels.some((l: string) => {
        const level = l.toLowerCase().trim();
        if (level === target) return true;
        if (level === "yle" && ["starters", "movers", "flyers"].includes(target)) return true;
        if (level.includes(target)) return true;
        if (target.includes(level) && level.length > 2) return true;
        if (target === "ket" && (level.includes("key") || level.includes("ket"))) return true;
        if (target === "pet" && (level.includes("preliminary") || level.includes("pet"))) return true;
        if (target === "fce" && (level.includes("first") || level.includes("fce") || level.includes("bec"))) return true;
        return false;
    });
}

// ---------------------------------------------------------------------------
// Zone / location helpers
// ---------------------------------------------------------------------------

/**
 * Maps city name substrings (lowercased) to their applicator location zone.
 * Used to classify applicators as "presencial" (same zone as school) or "remoto".
 */
export const CITY_TO_ZONE: Record<string, string> = {
    hermosillo: "Hermosillo",
    "agua prieta": "Hermosillo",
    obregon: "Obregón",
    obregón: "Obregón",
    "cd obregon": "Obregón",
    "cd. obregon": "Obregón",
    "ciudad obregon": "Obregón",
    tijuana: "Baja California",
    ensenada: "Baja California",
    mexicali: "Baja California",
    rosarito: "Baja California",
};

/**
 * Returns the zone name for a given city string, or null if unknown.
 * @param city  Free-form city name from the school record.
 */
export function getCityZone(city?: string | null): string | null {
    if (!city) return null;
    const lower = city.toLowerCase().trim();
    for (const [kw, zone] of Object.entries(CITY_TO_ZONE)) {
        if (lower.includes(kw)) return zone;
    }
    return null;
}
