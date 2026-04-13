import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    // 2. Get all members of that org without joining profiles
    const { data: members, error } = await supabase
        .from('org_members')
        .select(`*`)
        .eq('org_id', member.org_id);

    if (error || !members) throw error || new Error("No members found");

    // 3. Get profiles separately
    const userIds = members.map((m: {
        id: string;
        user_id: string;
        role: string;
        created_at: string;
        location: string | null;
        job_title: string | null;
    }) => m.user_id);
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

    const profilesMap = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p]));

    // 4. Get Emails securely using database RPC
    let emailsMap = new Map();
    if (userIds.length > 0) {
        const { data: emails } = await supabase.rpc('get_users_emails', { user_ids: userIds });
        if (emails) {
            emailsMap = new Map(emails.map((e: any) => [e.id, e.email]));
        }
    }

    const formattedMembers = members.map((m: {
        id: string;
        user_id: string;
        role: string;
        created_at: string;
        location: string | null;
        job_title: string | null;
    }) => {
        const profile = profilesMap.get(m.user_id) as any;
        return {
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            created_at: m.created_at,
            location: m.location || null,
            job_title: m.job_title || null,
            full_name: profile?.full_name || 'Sin nombre',
            email: emailsMap.get(m.user_id) || 'Sin correo'
        };
    });

    return NextResponse.json({ members: formattedMembers });
}, { module: "users", action: "view" });

export const DELETE = withAuth(async (req, { supabase }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "users", action: "delete" });
