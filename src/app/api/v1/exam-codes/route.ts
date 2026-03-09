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

        const { data: codes, error } = await supabase
            .from("exam_codes")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ codes });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

const examCodeSchema = z.object({
    exam_type: z.string().min(1),
    code: z.string().min(1),
    status: z.enum(["AVAILABLE", "USED", "EXPIRED"]).default("AVAILABLE"),
    registration_date: z.string().optional().nullable(),
    expiration_date: z.string().optional().nullable(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = examCodeSchema.safeParse(body);

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

        const { data: newCode, error } = await supabase
            .from("exam_codes")
            .insert({
                ...d,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "Failed to create: " + error.message }, { status: 500 });
        }

        return NextResponse.json({ code: newCode }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
