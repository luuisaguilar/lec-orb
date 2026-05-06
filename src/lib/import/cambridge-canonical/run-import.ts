import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getComponentOrderByExam } from "./exam-labels";
import type { IHApplicationRecord } from "./types";
import type { LogisticaSessionRecord } from "./types";

export type ImportSummary = {
    ihParsed: number;
    ihSkippedNoDate: number;
    ihWouldCreateEvents: number;
    ihExistingSkipped: number;
    schoolsCreated: number;
    eventsCreated: number;
    sessionsCreated: number;
    logisticaSessions: number;
    staffRowsWouldCreate: number;
    staffUnresolvedNames: string[];
    warnings: string[];
};

type IHGroupedEvent = {
    schoolName: string;
    schoolKey: string;
    dateIso: string;
    project: string;
    city: string | null;
    rows: IHApplicationRecord[];
};

const VENUE_ALIASES: Record<string, string> = {
    "INSTITUTO DE LOS PIONEROS": "INSTITUTO LOS PIONEROS",
    "IODI LEFIER": "INSTITUTO LEFIER",
    "IBV PRIMARIA OBREGON": "INSTITUTO BELLA VISTA",
    "IBV PRIMARIA": "INSTITUTO BELLA VISTA",
    "IBV SECUNDARIA": "INSTITUTO BELLA VISTA",
};

const APPLICATOR_NAME_ALIASES: Record<string, string> = {
    "LUPITA ZATARAIN": "LAURA GUADALUPE ZATARAIN NOGALES",
    "KAREN- REMOTO": "KAREN LOPEZ",
    "KAREN REMOTO": "KAREN LOPEZ",
    "SUPER MAJO": "MARIA JOSE",
};

function normalizeSchoolKey(name: string): string {
    return name
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/\s+/g, " ");
}

function normalizeVenueForMatching(venueLabel: string): string {
    const base = normalizeSchoolKey(venueLabel).replace(/^COLEGIO\s+/, "");
    const alias = VENUE_ALIASES[base];
    return alias ? normalizeSchoolKey(alias).replace(/^COLEGIO\s+/, "") : base;
}

function normalizeApplicatorInputName(rawName: string): string {
    let s = rawName
        .replace(/-REMOTO/gi, " ")
        .replace(/\(.*?\)/g, " ")
        .replace(/[:;,.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    s = s
        .replace(/\bADMIN(?:ISTRADOR|ISTRADORA)?\b/gi, " ")
        .replace(/\bINVIGILATOR(?:ES)?\b/gi, " ")
        .replace(/\bSUPER(?:VISOR(?:A)?)?\b/gi, " ")
        .replace(/\bSE\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    const key = normalizeSchoolKey(s);
    const alias = APPLICATOR_NAME_ALIASES[key];
    return alias ?? s;
}

function groupIHRowsBySchoolAndDate(rows: IHApplicationRecord[]): Map<string, IHGroupedEvent> {
    const grouped = new Map<string, IHGroupedEvent>();
    for (const row of rows) {
        if (!row.dateIso) continue;
        const schoolKey = normalizeSchoolKey(row.colegio);
        const groupKey = `${schoolKey}|${row.dateIso}|${normalizeSchoolKey(row.proyecto || "UNOi")}`;
        const current = grouped.get(groupKey);
        if (current) {
            current.rows.push(row);
            continue;
        }
        grouped.set(groupKey, {
            schoolName: row.colegio,
            schoolKey,
            dateIso: row.dateIso,
            project: row.proyecto || "UNOi",
            city: row.city || null,
            rows: [row],
        });
    }
    return grouped;
}

function canonicalImportKey(prefix: string, parts: Record<string, string>): string {
    const payload = Object.entries(parts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("|");
    return `${prefix}:${createHash("sha256").update(payload).digest("hex").slice(0, 24)}`;
}

async function loadSchoolMap(admin: SupabaseClient, orgId: string): Promise<Map<string, string>> {
    const { data, error } = await admin.from("schools").select("id,name").eq("org_id", orgId).is("deleted_at", null);
    if (error) throw error;
    const m = new Map<string, string>();
    for (const s of data ?? []) {
        m.set(normalizeSchoolKey(s.name), s.id);
    }
    return m;
}

function resolveSchoolIdFromMap(map: Map<string, string>, colegio: string): string | null {
    const k = normalizeSchoolKey(colegio);
    if (map.has(k)) return map.get(k) ?? null;
    for (const [nameKey, id] of map) {
        if (nameKey.includes(k) || k.includes(nameKey)) return id;
    }
    return null;
}

function matchSchoolFromVenue(map: Map<string, string>, venueLabel: string): string | null {
    const v = normalizeVenueForMatching(venueLabel);
    for (const [nameKey, id] of map) {
        const nk = nameKey.replace(/^COLEGIO\s+/, "");
        if (nk.includes(v) || v.includes(nk)) return id;
    }
    return null;
}

async function ensureSchool(
    admin: SupabaseClient,
    orgId: string,
    map: Map<string, string>,
    name: string,
    city: string | null,
    apply: boolean
): Promise<{ id: string; created: boolean }> {
    const existing = resolveSchoolIdFromMap(map, name);
    if (existing) return { id: existing, created: false };
    if (!apply) {
        return { id: "", created: true };
    }
    const { data, error } = await admin
        .from("schools")
        .insert({
            org_id: orgId,
            name: name.trim(),
            city: city?.trim() || null,
            levels: [],
        })
        .select("id")
        .single();
    if (error) throw error;
    map.set(normalizeSchoolKey(name), data.id);
    return { id: data.id, created: true };
}

async function findEventByImportKey(admin: SupabaseClient, orgId: string, key: string): Promise<string | null> {
    const { data, error } = await admin
        .from("events")
        .select("id")
        .eq("org_id", orgId)
        .filter("parameters->>canonical_import_key", "eq", key)
        .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
}

async function findMultiEventBySchoolAndDate(
    admin: SupabaseClient,
    orgId: string,
    schoolId: string,
    dateIso: string
): Promise<string | null> {
    const { data, error } = await admin
        .from("events")
        .select("id")
        .eq("org_id", orgId)
        .eq("school_id", schoolId)
        .eq("exam_type", "MULTI")
        .gte("date", `${dateIso}T00:00:00.000Z`)
        .lte("date", `${dateIso}T23:59:59.999Z`)
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
}

async function resolveApplicatorId(
    admin: SupabaseClient,
    orgId: string,
    rawName: string,
    createMissing: boolean,
    apply: boolean
): Promise<string | null> {
    const cleaned = normalizeApplicatorInputName(rawName);
    if (!cleaned || cleaned.toUpperCase().includes("FALTA")) return null;
    const exact = await admin.from("applicators").select("id").eq("org_id", orgId).ilike("name", cleaned).limit(3);
    if (exact.error) throw exact.error;
    if ((exact.data?.length ?? 0) > 1) return null;
    if (exact.data?.length === 1) return exact.data[0].id;
    const fuzzy = await admin
        .from("applicators")
        .select("id")
        .eq("org_id", orgId)
        .ilike("name", `%${cleaned}%`)
        .limit(2);
    if (fuzzy.error) throw fuzzy.error;
    if (fuzzy.data?.length === 1) return fuzzy.data[0].id;
    if ((fuzzy.data?.length ?? 0) > 1) return null;
    if (!createMissing || !apply) return null;
    const { data: ins, error: insErr } = await admin
        .from("applicators")
        .insert({
            org_id: orgId,
            name: cleaned,
            roles: ["APPLICATOR"],
            certified_levels: [],
        })
        .select("id")
        .single();
    if (insErr) throw insErr;
    return ins.id;
}

export async function runCambridgeCanonicalImport(
    admin: SupabaseClient,
    orgId: string,
    ihRows: IHApplicationRecord[],
    logisticaBySheet: Map<string, LogisticaSessionRecord[]>,
    options: { apply: boolean; createMissingApplicators: boolean; applyLogisticaStaff: boolean }
): Promise<ImportSummary> {
    const summary: ImportSummary = {
        ihParsed: ihRows.length,
        ihSkippedNoDate: 0,
        ihWouldCreateEvents: 0,
        ihExistingSkipped: 0,
        schoolsCreated: 0,
        eventsCreated: 0,
        sessionsCreated: 0,
        logisticaSessions: [...logisticaBySheet.values()].reduce((a, b) => a + b.length, 0),
        staffRowsWouldCreate: 0,
        staffUnresolvedNames: [],
        warnings: [],
    };

    const schoolMap = await loadSchoolMap(admin, orgId);

    for (const row of ihRows) {
        if (!row.dateIso) {
            summary.ihSkippedNoDate++;
            summary.warnings.push(`IH fila ${row.rowIndex}: sin fecha ISO (${row.examLabel} · ${row.colegio}) — omitido en import`);
        }
    }

    const groupedIH = groupIHRowsBySchoolAndDate(ihRows);
    summary.ihWouldCreateEvents = groupedIH.size;

    for (const [, group] of groupedIH) {
        const fp = canonicalImportKey("ih-multi", {
            orgId,
            school: group.schoolKey,
            date: group.dateIso,
            project: normalizeSchoolKey(group.project),
        });

        const existingId = await findEventByImportKey(admin, orgId, fp);
        if (existingId) {
            summary.ihExistingSkipped++;
            continue;
        }

        const { id: schoolId, created: schoolCreated } = await ensureSchool(
            admin,
            orgId,
            schoolMap,
            group.schoolName,
            group.city,
            options.apply
        );
        if (schoolCreated) summary.schoolsCreated++;

        if (!options.apply) continue;

        const byExam = new Map<string, { studentCount: number; rows: IHApplicationRecord[] }>();
        for (const row of group.rows) {
            const current = byExam.get(row.examType);
            if (current) {
                current.studentCount += row.studentCount;
                current.rows.push(row);
            } else {
                byExam.set(row.examType, { studentCount: row.studentCount, rows: [row] });
            }
        }

        const { data: ev, error: evErr } = await admin
            .from("events")
            .insert({
                org_id: orgId,
                school_id: schoolId,
                title: `${group.schoolName} · ${group.dateIso}`,
                date: `${group.dateIso}T12:00:00.000Z`,
                exam_type: "MULTI",
                status: "DRAFT",
                parameters: {
                    canonical_import_key: fp,
                    import_source: "ih_colegios_propuestas_fechas",
                    city: group.city,
                    project: group.project,
                    source_rows: group.rows.map((r) => r.rowIndex),
                    exams: [...byExam.keys()],
                    total_candidates: group.rows.reduce((acc, r) => acc + r.studentCount, 0),
                },
            })
            .select("id")
            .single();
        if (evErr) throw evErr;
        summary.eventsCreated++;

        const sessionsToInsert = [...byExam.entries()].map(([examType, info]) => ({
            event_id: ev.id,
            exam_type: examType,
            date: `${group.dateIso}T12:00:00.000Z`,
            classrooms: [{ name: "Importación IH", capacity: info.studentCount }],
            parameters: {
                start_time: "09:00",
                candidates_count: info.studentCount,
                examiners: 1,
                break_duration: 0,
                import_exam_labels: info.rows.map((r) => r.examLabel),
                import_status: info.rows.map((r) => r.estatus).filter(Boolean),
                import_propuestas: info.rows.map((r) => r.propuesta).filter(Boolean),
            },
            component_order: getComponentOrderByExam(examType),
        }));
        const { error: sesErr } = await admin.from("event_sessions").insert(sessionsToInsert);
        if (sesErr) throw sesErr;
        summary.sessionsCreated += sessionsToInsert.length;
    }

    if (!options.applyLogisticaStaff) {
        return summary;
    }

    const freshSchoolMap = await loadSchoolMap(admin, orgId);
    for (const [, sessions] of logisticaBySheet) {
        for (const s of sessions) {
            const schoolId = matchSchoolFromVenue(freshSchoolMap, s.venueLabel);
            if (!schoolId) {
                summary.warnings.push(`Logística ${s.sheetName} fila ${s.sourceRow}: sede "${s.venueLabel}" sin colegio coincidente`);
                continue;
            }
            const dateIso = s.writtenDayIso;
            if (!dateIso || !s.oralExamType) {
                summary.warnings.push(`Logística ${s.sheetName} fila ${s.sourceRow}: falta fecha escrita ISO o tipo oral`);
                continue;
            }

            const fp = canonicalImportKey("ih-multi", {
                orgId,
                school: [...freshSchoolMap.entries()].find(([, id]) => id === schoolId)?.[0] ?? "",
                date: dateIso,
                project: normalizeSchoolKey("UNOi"),
            });

            let eventId = await findEventByImportKey(admin, orgId, fp);
            if (!eventId) {
                eventId = await findMultiEventBySchoolAndDate(admin, orgId, schoolId, dateIso);
            }
            if (!eventId) {
                const { data: evs } = await admin
                    .from("events")
                    .select("id")
                    .eq("org_id", orgId)
                    .eq("school_id", schoolId)
                    .eq("exam_type", s.oralExamType)
                    .gte("date", `${dateIso}T00:00:00.000Z`)
                    .lte("date", `${dateIso}T23:59:59.999Z`)
                    .limit(1);
                eventId = evs?.[0]?.id ?? null;
            }
            if (!eventId) {
                summary.warnings.push(
                    `Logística ${s.sheetName} fila ${s.sourceRow}: no hay evento ${s.oralExamType} ${dateIso} para escuela — cargue IH primero o cree el evento`
                );
                continue;
            }

            const staffPayload: { event_id: string; org_id: string; applicator_id: string; role: string; notes?: string }[] =
                [];
            const addRole = async (name: string, role: string) => {
                const aid = await resolveApplicatorId(admin, orgId, name, options.createMissingApplicators, options.apply);
                if (!aid) {
                    if (!summary.staffUnresolvedNames.includes(name)) summary.staffUnresolvedNames.push(name);
                    return;
                }
                staffPayload.push({
                    event_id: eventId!,
                    org_id: orgId,
                    applicator_id: aid,
                    role,
                    notes: `import_logistica:${s.sheetName}:r${s.sourceRow}`,
                });
            };

            if (options.apply) {
                for (const n of s.oralExaminers) await addRole(n, "SE");
                for (const n of s.writtenStaff) await addRole(n, "INVIGILATOR");
                for (const sup of s.supervisorLabels) {
                    const parts = sup.split(/[;:]/).map((x) => x.trim()).filter(Boolean);
                    for (const p of parts) {
                        if (p.toUpperCase().includes("SUPERVISOR")) {
                            const name = p.replace(/SUPERVISOR\s*/i, "").trim();
                            if (name) await addRole(name, "SUPER");
                        }
                    }
                }
            } else {
                summary.staffRowsWouldCreate +=
                    s.oralExaminers.length +
                    s.writtenStaff.length +
                    s.supervisorLabels.reduce((acc, sup) => acc + sup.split(/[;:]/).filter((p) => /SUPERVISOR/i.test(p)).length, 0);
            }

            if (options.apply && staffPayload.length > 0) {
                const deduped: typeof staffPayload = [];
                const seen = new Set<string>();
                for (const row of staffPayload) {
                    const k = `${row.applicator_id}:${row.role}`;
                    if (seen.has(k)) continue;
                    seen.add(k);
                    deduped.push(row);
                }
                const { error: stErr } = await admin.from("event_staff").insert(deduped);
                if (stErr) {
                    if (stErr.code === "23505") {
                        summary.warnings.push(`Logística fila ${s.sourceRow}: duplicado staff (ya asignado)`);
                    } else {
                        throw stErr;
                    }
                }
            }
        }
    }

    return summary;
}
