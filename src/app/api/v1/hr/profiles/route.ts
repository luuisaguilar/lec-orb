import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";

const roleTypeSchema = z.enum(["directive", "coordination", "operative"]);

const createProfileSchema = z.object({
    node_id: z.string().min(1).max(100),
    role_title: z.string().min(1).max(200),
    holder_name: z.string().max(200).optional().nullable(),
    area: z.string().max(100).optional().nullable(),
    role_type: roleTypeSchema.optional().nullable(),
    mission: z.string().optional().nullable(),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.object({
        education: z.string().optional().nullable(),
        experience: z.string().optional().nullable(),
        languages: z.string().optional().nullable(),
        knowledge: z.string().optional().nullable(),
    }).default({}),
    parent_node_id: z.string().max(100).optional().nullable(),
    process_id: z.string().max(50).optional().nullable(),
    last_pdf_path: z.string().optional().nullable(),
});

const updateProfileSchema = z.object({
    node_id: z.string().min(1).max(100),
    role_title: z.string().min(1).max(200).optional(),
    holder_name: z.string().max(200).optional().nullable(),
    area: z.string().max(100).optional().nullable(),
    role_type: roleTypeSchema.optional().nullable(),
    mission: z.string().optional().nullable(),
    responsibilities: z.array(z.string()).optional(),
    requirements: z.object({
        education: z.string().optional().nullable(),
        experience: z.string().optional().nullable(),
        languages: z.string().optional().nullable(),
        knowledge: z.string().optional().nullable(),
    }).optional(),
    process_id: z.string().max(50).optional().nullable(),
    last_pdf_path: z.string().optional().nullable(),
});

export const GET = withAuth(async (_req, { supabase, member }) => {
    const { data, error } = await supabase
        .from("hr_profiles")
        .select("id, node_id, role_title, holder_name, area, role_type, mission, responsibilities, requirements, parent_node_id, process_id, last_pdf_path, created_at, updated_at")
        .eq("org_id", member.org_id)
        .order("role_title", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ profiles: data ?? [] });
}, { module: "rrhh", action: "view" });

export const POST = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = createProfileSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const payload = parsed.data;

    const { data, error } = await supabase
        .from("hr_profiles")
        .insert({
            org_id: member.org_id,
            node_id: payload.node_id,
            role_title: payload.role_title,
            holder_name: payload.holder_name ?? null,
            area: payload.area ?? null,
            role_type: payload.role_type ?? null,
            mission: payload.mission ?? null,
            responsibilities: payload.responsibilities,
            requirements: payload.requirements ?? {},
            parent_node_id: payload.parent_node_id ?? null,
            process_id: payload.process_id ?? null,
            last_pdf_path: payload.last_pdf_path ?? null,
        })
        .select("id, node_id, role_title, holder_name, area, role_type, mission, responsibilities, requirements, parent_node_id, process_id, last_pdf_path, created_at, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "hr_profiles",
        record_id: data.id,
        action: "INSERT",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ profile: data }, { status: 201 });
}, { module: "rrhh", action: "edit" });

export const PATCH = withAuth(async (req, { supabase, member, user }) => {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.format() },
            { status: 400 }
        );
    }

    const payload = parsed.data;
    const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (payload.role_title !== undefined) updates.role_title = payload.role_title;
    if (payload.holder_name !== undefined) updates.holder_name = payload.holder_name;
    if (payload.area !== undefined) updates.area = payload.area;
    if (payload.role_type !== undefined) updates.role_type = payload.role_type;
    if (payload.mission !== undefined) updates.mission = payload.mission;
    if (payload.responsibilities !== undefined) updates.responsibilities = payload.responsibilities;
    if (payload.requirements !== undefined) updates.requirements = payload.requirements;
    if (payload.process_id !== undefined) updates.process_id = payload.process_id;
    if (payload.last_pdf_path !== undefined) updates.last_pdf_path = payload.last_pdf_path;

    const { data, error } = await supabase
        .from("hr_profiles")
        .update(updates)
        .eq("org_id", member.org_id)
        .eq("node_id", payload.node_id)
        .select("id, node_id, role_title, holder_name, area, role_type, mission, responsibilities, requirements, parent_node_id, process_id, last_pdf_path, created_at, updated_at")
        .single();

    if (error) throw error;

    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "hr_profiles",
        record_id: data.id,
        action: "UPDATE",
        new_data: data,
        performed_by: user.id,
    });

    return NextResponse.json({ profile: data });
}, { module: "rrhh", action: "edit" });
