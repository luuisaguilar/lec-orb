import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

type SgcAuditRow = {
  id: string;
  audit_manager_id: string | null;
  [key: string]: unknown;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

const createAuditSchema = z.object({
  title: z.string().min(1).max(200),
  audit_date: z.string().optional(),
  audit_manager_id: z.string().uuid().optional().nullable(),
});

function buildAuditRef() {
  const year = new Date().getFullYear();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `AUD-${year}-${token}`;
}

export const GET = withAuth(async (_req, { supabase, member }) => {
  const { data, error } = await supabase
    .from("sgc_audits")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const audits = (data ?? []) as SgcAuditRow[];
  const managerIds = Array.from(
    new Set(
      audits
        .map((audit: SgcAuditRow) => audit.audit_manager_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let managerById = new Map<string, { id: string; full_name: string | null }>();
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", managerIds);

    managerById = new Map(
      ((managers ?? []) as ProfileRow[]).map((row: ProfileRow) => [
        row.id,
        { id: row.id, full_name: row.full_name ?? null },
      ])
    );
  }

  const enriched = audits.map((audit: SgcAuditRow) => ({
    ...audit,
    audit_manager: audit.audit_manager_id ? managerById.get(audit.audit_manager_id) ?? null : null,
  }));

  return NextResponse.json({ audits: enriched });
}, { module: "sgc", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
  const body = await req.json();
  const parsed = createAuditSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  let data: any = null;
  let error: any = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await supabase
      .from("sgc_audits")
      .insert({
        org_id: member.org_id,
        ref: buildAuditRef(),
        title: parsed.data.title,
        audit_date: parsed.data.audit_date || new Date().toISOString(),
        audit_manager_id: parsed.data.audit_manager_id,
        state: "open",
        created_by: user.id,
      })
      .select()
      .single();

    data = result.data;
    error = result.error;

    const isDuplicateRef =
      Boolean(error) &&
      error.code === "23505" &&
      String(error.message ?? "").includes("sgc_audits_org_id_ref_key");

    if (!isDuplicateRef) break;
  }

  if (error) throw error;

  // Initialize checklist items for the new audit
  const starterItems = [
    { clause_id: '4.1', title: 'Contexto de la organizacion', question: 'Se han determinado las cuestiones externas e internas pertinentes para su proposito y direccion estrategica?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 1 },
    { clause_id: '4.2', title: 'Partes interesadas', question: 'Se comprenden las necesidades y expectativas de los estudiantes y otros beneficiarios?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 2 },
    { clause_id: '5.1', title: 'Liderazgo y compromiso', question: 'La alta direccion demuestra liderazgo y compromiso con el Sistema de Gestion?', tags: ['ISO 9001'], sort_order: 3 },
    { clause_id: '5.1.2', title: 'Enfoque al estudiante', question: 'Se mantiene el enfoque principal en la satisfaccion de las necesidades de los alumnos?', tags: ['ISO 21001'], sort_order: 4 },
    { clause_id: '5.2', title: 'Politica Integral', question: 'La politica es apropiada al proposito de la organizacion y se comunica?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 5 },
    { clause_id: '6.1', title: 'Acciones para abordar riesgos', question: 'Se han determinado los riesgos y oportunidades que es necesario abordar?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 6 },
    { clause_id: '6.2', title: 'Objetivos de Calidad', question: 'Se han establecido objetivos coherentes con la politica y son medibles?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 7 },
    { clause_id: '7.1.5', title: 'Recursos de seguimiento', question: 'Se determinan y proporcionan los recursos necesarios para la validez de los resultados?', tags: ['ISO 9001'], sort_order: 8 },
    { clause_id: '7.2', title: 'Competencia', question: 'Se asegura que el personal es competente basado en educacion y experiencia?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 9 },
    { clause_id: '8.1', title: 'Planificacion y control', question: 'Se planifican, implementan y controlan los procesos necesarios para la provision del servicio educativo?', tags: ['ISO 21001'], sort_order: 10 },
    { clause_id: '8.5', title: 'Control de la prestacion', question: 'Se implementa el servicio bajo condiciones controladas y se valida el material didactico?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 11 },
    { clause_id: '9.1', title: 'Satisfaccion del cliente y estudiante', question: 'Se realiza seguimiento a las percepciones de los estudiantes sobre el cumplimiento de sus necesidades?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 12 },
    { clause_id: '9.2', title: 'Auditoria interna', question: 'Se llevan a cabo auditorias internas a intervalos planificados?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 13 },
    { clause_id: '10.2', title: 'No conformidad y accion correctiva', question: 'Se toman acciones para controlar y corregir las no conformidades?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 14 },
    { clause_id: '10.3', title: 'Mejora continua', question: 'Se mejora continuamente la conveniencia, adecuacion y eficacia del SGC?', tags: ['ISO 9001', 'ISO 21001'], sort_order: 15 }
  ];

  const checksToInsert = starterItems.map(item => ({
    org_id: member.org_id,
    audit_id: data.id,
    ...item,
    status: 'pending'
  }));

  const { error: checksError } = await supabase
    .from("sgc_audit_checks")
    .insert(checksToInsert);

  if (checksError) {
    console.error("Error initializing checklist:", checksError);
    // We don't throw here to avoid rolling back the audit creation, 
    // but in a production app we might want a transaction.
  }

  await logAudit(supabase, {
    org_id: member.org_id,
    table_name: "sgc_audits",
    record_id: data.id,
    action: "INSERT",
    new_data: data,
    performed_by: user.id,
  });

  return NextResponse.json({ audit: data }, { status: 201 });
}, { module: "sgc", action: "edit" });
