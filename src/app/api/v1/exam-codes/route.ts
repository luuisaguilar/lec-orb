import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase }) => {
    const { data: codes, error } = await supabase
        .from("exam_codes")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ codes });
}, { module: "exam-codes", action: "view" });

const examCodeSchema = z.object({
    exam_type: z.string().min(1),
    code: z.string().min(1),
    status: z.enum(["AVAILABLE", "USED", "EXPIRED"]).default("AVAILABLE"),
    registration_date: z.string().optional().nullable(),
    expiration_date: z.string().optional().nullable(),
});

export const POST = withAuth(async (req, { supabase, user }) => {
    const body = await req.json();
    const parsed = examCodeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    const { data: newCode, error } = await supabase
        .from("exam_codes")
        .insert({
            ...parsed.data,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ code: newCode }, { status: 201 });
}, { module: "exam-codes", action: "edit" });
