import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

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

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const parsed = bulkApplicatorSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos o incompletos." }, { status: 400 });
    }

    if (member.role !== "admin" && member.role !== "supervisor") {
        return NextResponse.json({ error: "Permisos insuficientes para carga masiva" }, { status: 403 });
    }

    const payload = parsed.data.applicators.map(app => ({
        ...app,
        org_id: member.org_id,
        roles: app.roles || ["APPLICATOR"],
        certified_levels: [],
    }));

    const { error } = await supabase.from("applicators").insert(payload);
    if (error) throw error;

    return NextResponse.json({ success: true, count: payload.length }, { status: 201 });
}, { module: "applicators", action: "edit" });
