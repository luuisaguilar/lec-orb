import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canView = await checkServerPermission(supabase, user.id, "examenes", "view");
        if (!canView) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { data: adminis, error } = await supabase
            .from("toefl_administrations")
            .select("*")
            .eq("is_active", true)
            .order("test_date", { ascending: false });

        if (error) throw error;

        // Map test_date to start_date for the frontend
        const mappedAdminis = adminis.map((a) => ({
            ...a,
            start_date: a.test_date,
        }));

        return NextResponse.json({ administrations: mappedAdminis });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

const administrationSchema = z.object({
    name: z.string().min(1),
    start_date: z.string(),
    end_date: z.string(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = administrationSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canEdit = await checkServerPermission(supabase, user.id, "examenes", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions to create" }, { status: 403 });
        }

        const d = parsed.data;

        const { data: newAdmin, error } = await supabase
            .from("toefl_administrations")
            .insert({
                name: d.name,
                test_date: d.start_date, // Maps start_date from UI to test_date in DB
                end_date: d.end_date,
                test_type: "N/A", // Bypass NOT NULL constraint
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "Failed to create: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ administration: newAdmin }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
