import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const createCheckSchema = z.object({
  procedure_reference: z.string().optional().nullable(),
  question: z.string().min(1),
  is_conformed: z.boolean().default(false),
  comments: z.string().optional().nullable(),
  seq: z.number().int().default(10),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
  const { id } = await params;

  const { data, error } = await supabase
    .from("sgc_audit_checks")
    .select("*")
    .eq("audit_id", id)
    .eq("org_id", member.org_id)
    .order("seq", { ascending: true });

  if (error) throw error;

  return NextResponse.json({ checks: data });
}, { module: "sgc", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const parsed = createCheckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("sgc_audit_checks")
    .insert({
      org_id: member.org_id,
      audit_id: id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) throw error;

  await logAudit(supabase, {
    org_id: member.org_id,
    table_name: "sgc_audit_checks",
    record_id: data.id,
    action: "INSERT",
    new_data: data,
    performed_by: user.id,
  });

  return NextResponse.json({ check: data }, { status: 201 });
}, { module: "sgc", action: "edit" });
