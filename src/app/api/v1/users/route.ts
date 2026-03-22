import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

type OrgMemberRow = {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
    location: string | null;
    job_title: string | null;
};

type ProfileRow = {
    id: string;
    full_name: string | null;
};

type UserEmailRow = {
    id: string;
    email: string | null;
};

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data: members, error } = await supabase
        .from("org_members")
        .select("*")
        .eq("org_id", member.org_id);

    if (error || !members) throw error || new Error("No members found");

    const orgMembers = members as OrgMemberRow[];
    const userIds = orgMembers.map((currentMember) => currentMember.user_id);

    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

    const profilesMap = new Map(
        ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile] as const)
    );

    const emailsMap = new Map<string, string>();
    if (userIds.length > 0) {
        const { data: emails } = await supabase.rpc("get_users_emails", { user_ids: userIds });
        ((emails ?? []) as UserEmailRow[]).forEach((emailRow) => {
            emailsMap.set(emailRow.id, emailRow.email ?? "Sin correo");
        });
    }

    const formattedMembers = orgMembers.map((currentMember) => {
        const profile = profilesMap.get(currentMember.user_id);
        return {
            id: currentMember.id,
            user_id: currentMember.user_id,
            role: currentMember.role,
            created_at: currentMember.created_at,
            location: currentMember.location,
            job_title: currentMember.job_title,
            full_name: profile?.full_name || "Sin nombre",
            email: emailsMap.get(currentMember.user_id) || "Sin correo",
        };
    });

    return NextResponse.json({ members: formattedMembers });
}, { module: "users", action: "view" });

export const DELETE = withAuth(async (req, { supabase }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
}, { module: "users", action: "delete" });
