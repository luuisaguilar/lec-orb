import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, user, member }) => {
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    const { data: access } = await supabase
        .from('member_module_access')
        .select('module, can_view, can_edit, can_delete')
        .eq('member_id', member.id);

    return NextResponse.json({
        user: {
            id: user.id,
            email: user.email,
            full_name: profile?.full_name,
        },
        organization: { id: member.org_id },
        role: member.role,
        permissions: access || []
    });
}); // No module guard — every authenticated member can read their own profile
