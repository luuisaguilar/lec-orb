import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkServerPermission } from "@/lib/auth/permissions";

// ── Zod schema ────────────────────────────────────────────────────────────────
const inviteSchema = z.object({
    email: z.string().email("Email inválido"),
    role: z.enum(["admin", "supervisor", "operador", "applicator"], {
        message: "Rol inválido",
    }),
});

// ── GET /api/v1/invitations ───────────────────────────────────────────────────
export async function GET() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canView = await checkServerPermission(supabase, user.id, "usuarios", "view");
    if (!canView) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

    const { data: membership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

    if (!membership) return NextResponse.json({ error: "No organization found" }, { status: 404 });

    const { data: invitations, error } = await supabase
        .from('org_invitations')
        .select('*')
        .eq('org_id', membership.org_id)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ invitations });
}

// ── POST /api/v1/invitations ──────────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = inviteSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Datos inválidos", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Permission check: only users with management rights can invite
        const canEdit = await checkServerPermission(supabase, user.id, "usuarios", "edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        // Existing defense: admin-only, kept as second layer
        const { data: membership, error: membershipError } = await supabase
            .from('org_members')
            .select('org_id, role')
            .eq('user_id', user.id)
            .single();

        if (membershipError) console.error("Membership fetch error:", membershipError);

        if (!membership || membership.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { data: invitation, error } = await supabase
            .from('org_invitations')
            .insert({
                org_id: membership.org_id,
                email: parsed.data.email,
                role: parsed.data.role,
                invited_by: user.id
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error in invite:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ invitation });
    } catch (e: any) {
        console.error("Fatal error in invitations POST:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
