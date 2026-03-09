import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";
import { mockApplicators, addMockApplicator } from "@/lib/demo/data";

export async function GET() {
    if (DEMO_MODE) {
        return NextResponse.json({
            applicators: mockApplicators.filter((a) => !a.deleted_at),
            total: mockApplicators.filter((a) => !a.deleted_at).length,
        });
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const { data, error } = await supabase
            .from("applicators")
            .select("*")
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .order("name");

        if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
        return NextResponse.json({ applicators: data || [], total: data?.length || 0 });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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

export async function POST(request: Request) {
    const body = await request.json();
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

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id, role").eq("user_id", user.id).single();
        if (!member || !["admin", "supervisor"].includes(member.role))
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

        const { data: applicator, error } = await supabase
            .from("applicators")
            .insert({ org_id: member.org_id, ...parsed.data })
            .select()
            .single();

        if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
        return NextResponse.json({ applicator }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
