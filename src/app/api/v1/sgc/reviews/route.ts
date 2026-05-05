import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const createReviewSchema = z.object({
  title: z.string().min(1).max(200),
  review_date: z.string().optional(),
});

export const GET = withAuth(async (_req, { supabase, member }) => {
  const { data, error } = await supabase
    .from("sgc_reviews")
    .select(`
      *,
      creator:created_by(id, full_name)
    `)
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return NextResponse.json({ reviews: data });
}, { module: "sgc", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
  const body = await req.json();
  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  // Generate ref
  const { count } = await supabase
    .from("sgc_reviews")
    .select("*", { count: "exact", head: true })
    .eq("org_id", member.org_id);
    
  const ref = `REV-${(count || 0) + 1}`;

  const { data, error } = await supabase
    .from("sgc_reviews")
    .insert({
      org_id: member.org_id,
      ref,
      title: parsed.data.title,
      review_date: parsed.data.review_date || new Date().toISOString(),
      state: "open",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  await logAudit(supabase, {
    org_id: member.org_id,
    table_name: "sgc_reviews",
    record_id: data.id,
    action: "INSERT",
    new_data: data,
    performed_by: user.id,
  });

  return NextResponse.json({ review: data }, { status: 201 });
}, { module: "sgc", action: "edit" });
