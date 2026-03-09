import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();

    // 1. Get current user's org
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: membership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

    if (!membership) return NextResponse.json({ error: "No organization found" }, { status: 404 });

    // 2. Get all members of that org without joining profiles
    const { data: members, error } = await supabase
        .from('org_members')
        .select(`
            *
        `)
        .eq('org_id', membership.org_id);

    if (error || !members) return NextResponse.json({ error: error?.message || "No members found" }, { status: 500 });

    // 3. Get profiles separately
    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

    // 4. Get Emails securely using database RPC
    let emailsMap = new Map();
    if (userIds.length > 0) {
        const { data: emails } = await supabase.rpc('get_users_emails', { user_ids: userIds });
        if (emails) {
            emailsMap = new Map(emails.map((e: any) => [e.id, e.email]));
        }
    }

    // Flatten the result for easier UI consumption
    const formattedMembers = members.map(m => {
        const profile = profilesMap.get(m.user_id) as any;
        return {
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            created_at: m.created_at,
            location: m.location || null,
            job_title: m.job_title || null,
            full_name: profile?.full_name || 'Sin nombre',
            email: emailsMap.get(m.user_id) || 'Sin correo' // Loaded securely via RPC
        };
    });

    return NextResponse.json({ members: formattedMembers });
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const supabase = await createClient();

    // Verify admin role first
    const { data: { user } } = await supabase.auth.getUser();
    const { data: caller } = await supabase
        .from('org_members')
        .select('role')
        .eq('user_id', user?.id)
        .single();

    if (caller?.role !== 'admin') {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
