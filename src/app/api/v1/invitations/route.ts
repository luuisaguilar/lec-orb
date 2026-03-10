import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/with-handler";

const inviteSchema = z.object({
    email: z.string().email("Email inválido"),
    role: z.enum(["admin", "supervisor", "operador", "applicator"], {
        message: "Rol inválido",
    }),
});

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: invitations, error } = await supabase
        .from('org_invitations')
        .select('*')
        .eq('org_id', member.org_id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ invitations });
}, { module: "users", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // Role check: only admins can invite
    if (member.role !== 'admin') {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { data: invitation, error } = await supabase
        .from('org_invitations')
        .insert({
            org_id: member.org_id,
            email: parsed.data.email,
            role: parsed.data.role,
            invited_by: user.id
        })
        .select()
        .single();

    if (error) throw error;
    return NextResponse.json({ invitation });
}, { module: "users", action: "edit" });
