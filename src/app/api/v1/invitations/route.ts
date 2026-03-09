import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error("Auth error in admin invite:", authError);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get org_id and verify admin
        const { data: membership, error: membershipError } = await supabase
            .from('org_members')
            .select('org_id, role')
            .eq('user_id', user.id)
            .single();

        if (membershipError) console.error("Membership fetch error:", membershipError);

        if (!membership || membership.role !== 'admin') {
            console.error("Forbidden, user is not admin:", membership);
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { data: invitation, error } = await supabase
            .from('org_invitations')
            .insert({
                org_id: membership.org_id,
                email: body.email,
                role: body.role,
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
