import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";
import { mockApplicators, addMockApplicator } from "@/lib/demo/data";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    if (DEMO_MODE) {
        return NextResponse.json({
            applicators: mockApplicators.filter((a) => !a.deleted_at),
            total: mockApplicators.filter((a) => !a.deleted_at).length,
        });
    }

    const { data, error } = await supabase
        .from("applicators")
        .select("*")
        .eq("org_id", member.org_id)
        .is("deleted_at", null)
        .order("name");

    if (error) throw error;
    return NextResponse.json({ applicators: data || [], total: data?.length || 0 });
}, { module: "applicators", action: "view" });

const createApplicatorSchema = z.object({
    name: z.string().min(1),
    external_id: z.string().optional().nullable(),
    birth_date: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    location_zone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    rate_per_hour: z.number().optional().nullable(),
    roles: z.array(z.string()).optional().default([]),
    certified_levels: z.array(z.string()).optional().default([]),
    authorized_exams: z.array(z.string()).optional().default([]),
    notes: z.string().optional().nullable(),
});

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = createApplicatorSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    if (DEMO_MODE) {
        const d = parsed.data;
        const applicator = addMockApplicator({
            name: d.name,
            email: d.email ?? null,
            phone: d.phone ?? null,
            rate_per_hour: d.rate_per_hour ?? null,
            roles: d.roles ?? [],
            certified_levels: d.certified_levels ?? [],
            auth_user_id: null,
            notes: d.notes ?? null,
        });
        return NextResponse.json({ applicator }, { status: 201 });
    }

    const { data: applicator, error } = await supabase
        .from("applicators")
        .insert({ org_id: member.org_id, ...parsed.data })
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ applicator }, { status: 201 });
}, { module: "applicators", action: "edit" });
