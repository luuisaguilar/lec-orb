import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase }) => {
    const { data: adminis, error } = await supabase
        .from("toefl_administrations")
        .select("*")
        .eq("is_active", true)
        .order("test_date", { ascending: false });

    if (error) throw error;

    const mappedAdminis = adminis.map((a: any) => ({
        ...a,
        start_date: a.test_date,
    }));

    return NextResponse.json({ administrations: mappedAdminis });
}, { module: "toefl", action: "view" });

const administrationSchema = z.object({
    name: z.string().min(1),
    start_date: z.string(),
    end_date: z.string(),
});

export const POST = withAuth(async (req, { supabase, user }) => {
    const body = await req.json();
    const parsed = administrationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    const { data: newAdmin, error } = await supabase
        .from("toefl_administrations")
        .insert({
            name: parsed.data.name,
            test_date: parsed.data.start_date,
            end_date: parsed.data.end_date,
            test_type: "N/A",
            created_by: user.id,
        })
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ administration: newAdmin }, { status: 201 });
}, { module: "toefl", action: "edit" });
