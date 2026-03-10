import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";
import { mockSchools } from "@/lib/demo/data";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    if (DEMO_MODE) {
        return NextResponse.json({
            schools: mockSchools.filter((s) => !s.deleted_at),
            total: mockSchools.filter((s) => !s.deleted_at).length,
        });
    }

    const { data: schools, error } = await supabase
        .from("schools")
        .select("*")
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .order("name");

    if (error) throw error;
    
    return NextResponse.json({ schools: schools || [], total: schools?.length || 0 });
}, { module: "schools", action: "view" });

const createSchoolSchema = z.object({
    name: z.string().min(1),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    contact_name: z.string().optional().nullable(),
    contact_phone: z.string().optional().nullable(),
    contact_email: z.string().optional().nullable(),
    levels: z.array(z.string()).optional().default([]),
    operating_hours: z.object({
        open: z.string(),
        close: z.string(),
    }).optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = createSchoolSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const { data: school, error } = await supabase
        .from("schools")
        .insert({
            org_id: member.org_id,
            ...parsed.data,
            operating_hours: parsed.data.operating_hours
                ? JSON.stringify(parsed.data.operating_hours)
                : null,
        })
        .select()
        .single();

    if (error) throw error;
    
    return NextResponse.json({ school }, { status: 201 });
}, { module: "schools", action: "edit" });
