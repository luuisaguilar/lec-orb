import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";

const bulkApplicatorSchema = z.object({
    applicators: z.array(z.object({
        external_id: z.string().optional().nullable(),
        name: z.string().min(1),
        birth_date: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        authorized_exams: z.array(z.string()).optional().default([]),
        roles: z.array(z.string()).optional().default(["APPLICATOR"]),
    }))
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = bulkApplicatorSchema.safeParse(body);
        if (!parsed.success) {
            console.error("Bulk validation failed:", parsed.error);
            return NextResponse.json({ error: "Datos inválidos o incompletos." }, { status: 400 });
        }

        if (DEMO_MODE) {
            const { addBulkMockApplicators } = await import("@/lib/demo/data");

            const newApps = parsed.data.applicators.map(d => ({
                name: d.name,
                external_id: d.external_id ?? null,
                email: d.email ?? null,
                phone: d.phone ?? null,
                birth_date: d.birth_date ?? null,
                city: d.city ?? null,
                rate_per_hour: null,
                roles: d.roles ?? ["APPLICATOR"],
                certified_levels: [],
                authorized_exams: d.authorized_exams ?? [],
                auth_user_id: null,
                notes: null,
            }));

            addBulkMockApplicators(newApps);
            return NextResponse.json({ count: newApps.length, success: true }, { status: 201 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Retrieve org constraints
        const { data: member } = await supabase.from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member || !["admin", "supervisor"].includes(member.role)) {
            return NextResponse.json({ error: "Permisos insuficientes para carga masiva" }, { status: 403 });
        }

        // Attach org_id to all applicators
        const payload = parsed.data.applicators.map(app => ({
            ...app,
            org_id: member.org_id,
            // default arrays if not provided
            roles: app.roles || ["APPLICATOR"],
            certified_levels: [], // usually managed elsewhere, but empty by default
        }));

        const { error } = await supabase
            .from("applicators")
            .insert(payload);

        if (error) {
            console.error("Supabase Bulk Insert Error:", error);
            // It might fail on unique email/phone constraints or data types.
            return NextResponse.json({ error: "Error al guardar en la base de datos. Verifica si hay correos duplicados." }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: payload.length }, { status: 201 });

    } catch (err: any) {
        console.error("Bulk applicator catch error:", err);
        return NextResponse.json({ error: "Error interno en el servidor." }, { status: 500 });
    }
}
