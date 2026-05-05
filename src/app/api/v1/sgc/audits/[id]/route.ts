import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

type AuditParticipantRow = {
  user_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

const updateAuditSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  audit_date: z.string().optional(),
  state: z.enum(["open", "done"]).optional(),
  audit_manager_id: z.string().uuid().optional().nullable(),
  strong_points: z.string().optional().nullable(),
  to_improve_points: z.string().optional().nullable(),
  closing_date: z.string().optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
  const { id } = await params;

  const { data, error } = await supabase
    .from("sgc_audits")
    .select("*")
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (error) throw error;
  if (!data) return NextResponse.json({ error: "Audit not found" }, { status: 404 });

  const [{ data: checks, error: checksError }, { data: auditors, error: auditorsError }, { data: auditees, error: auditeesError }] = await Promise.all([
    supabase
      .from("sgc_audit_checks")
      .select("*")
      .eq("org_id", member.org_id)
      .eq("audit_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("sgc_audit_auditors")
      .select("user_id")
      .eq("org_id", member.org_id)
      .eq("audit_id", id),
    supabase
      .from("sgc_audit_auditees")
      .select("user_id")
      .eq("org_id", member.org_id)
      .eq("audit_id", id),
  ]);

  if (checksError) throw checksError;
  if (auditorsError) throw auditorsError;
  if (auditeesError) throw auditeesError;

  const auditorsRows = (auditors ?? []) as AuditParticipantRow[];
  const auditeesRows = (auditees ?? []) as AuditParticipantRow[];

  const userIds = Array.from(
    new Set([
      data.audit_manager_id,
      ...auditorsRows.map((row: AuditParticipantRow) => row.user_id),
      ...auditeesRows.map((row: AuditParticipantRow) => row.user_id),
    ].filter((value): value is string => Boolean(value)))
  );

  let profilesById = new Map<string, { id: string; full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    profilesById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile: ProfileRow) => [
        profile.id,
        { id: profile.id, full_name: profile.full_name ?? null },
      ])
    );
  }

  const payload = {
    ...data,
    audit_manager: data.audit_manager_id ? profilesById.get(data.audit_manager_id) ?? null : null,
    auditors: auditorsRows.map((row: AuditParticipantRow) => ({
      user: profilesById.get(row.user_id) ?? { id: row.user_id, full_name: null },
    })),
    auditees: auditeesRows.map((row: AuditParticipantRow) => ({
      user: profilesById.get(row.user_id) ?? { id: row.user_id, full_name: null },
    })),
    checks: checks ?? [],
  };

  return NextResponse.json({ audit: payload });
}, { module: "sgc", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateAuditSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  // If state is being changed to 'done', set closing_date if not provided
  const updateData = { ...parsed.data };
  if (updateData.state === "done" && !updateData.closing_date) {
    updateData.closing_date = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("sgc_audits")
    .update({
      ...updateData,
      updated_by: user.id,
    })
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select()
    .single();

  if (error) throw error;

  await logAudit(supabase, {
    org_id: member.org_id,
    table_name: "sgc_audits",
    record_id: id,
    action: "UPDATE",
    new_data: data,
    performed_by: user.id,
  });

  return NextResponse.json({ audit: data });
}, { module: "sgc", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, member, user }, { params }) => {
  const { id } = await params;

  // Instead of hard delete, we could use a status, but the migration allows DELETE.
  // We'll follow the standard for the project.
  const { error } = await supabase
    .from("sgc_audits")
    .delete()
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) throw error;

  await logAudit(supabase, {
    org_id: member.org_id,
    table_name: "sgc_audits",
    record_id: id,
    action: "DELETE",
    performed_by: user.id,
  });

  return NextResponse.json({ success: true });
}, { module: "sgc", action: "delete" });
