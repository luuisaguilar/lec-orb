import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const updateReviewSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  review_date: z.string().optional(),
  state: z.enum(["open", "done"]).optional(),
  policy: z.string().optional().nullable(),
  changes: z.string().optional().nullable(),
  conclusion: z.string().optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }, { params }) => {
  const { id } = await params;

  const { data, error } = await supabase
    .from("sgc_reviews")
    .select(`
      *,
      creator:created_by(id, full_name)
    `)
    .eq("id", id)
    .eq("org_id", member.org_id)
    .single();

  if (error) throw error;
  if (!data) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  return NextResponse.json({ review: data });
}, { module: "sgc", action: "view" });

export const PATCH = withAuth(async (req, { supabase, member, user }, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("sgc_reviews")
    .update({
      ...parsed.data,
      updated_by: user.id,
    })
    .eq("id", id)
    .eq("org_id", member.org_id)
    .select()
    .single();

  if (error) throw error;

  await logAudit(supabase, {
    org_id: member.org_id,
    table_name: "sgc_reviews",
    record_id: id,
    action: "UPDATE",
    new_data: data,
    performed_by: user.id,
  });

  return NextResponse.json({ review: data });
}, { module: "sgc", action: "edit" });

export const DELETE = withAuth(async (_req, { supabase, member, user }, { params }) => {
  const { id } = await params;

  const { error } = await supabase
    .from("sgc_reviews")
    .delete()
    .eq("id", id)
    .eq("org_id", member.org_id);

  if (error) throw error;

  await logAudit(supabase, {
    org_id: member.org_id,
    table_name: "sgc_reviews",
    record_id: id,
    action: "DELETE",
    performed_by: user.id,
  });

  return NextResponse.json({ success: true });
}, { module: "sgc", action: "delete" });
