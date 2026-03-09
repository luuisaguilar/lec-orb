import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";
import { mockSchools } from "@/lib/demo/data";
import { checkServerPermission } from "@/lib/auth/permissions";

export async function GET() {
    if (DEMO_MODE) {
        return NextResponse.json({
            schools: mockSchools.filter((s) => !s.deleted_at),
            total: mockSchools.filter((s) => !s.deleted_at).length,
        });
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const canView = await checkServerPermission(supabase, user.id, "colegios", "view");
        if (!canView) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

        const { data: schools, error } = await supabase
            .from("schools")
            .select("*")
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .order("name");

        if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
        return NextResponse.json({ schools: schools || [], total: schools?.length || 0 });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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

export async function POST(request: Request) {
    const body = await request.json();
    const parsed = createSchoolSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id, role").eq("user_id", user.id).single();
        if (!member || !["admin", "supervisor"].includes(member.role))
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

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

        if (error) {
            console.error("Schools insert error stack:", error);
            return NextResponse.json({ error: `Database error: ${error.message} (Detail: ${error.details})` }, { status: 500 });
        }
        return NextResponse.json({ school }, { status: 201 });
    } catch (err: any) {
        console.error("Schools server error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
