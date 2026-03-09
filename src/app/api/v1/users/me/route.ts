import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Get current auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("Auth error in /me:", authError);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get member and profile info
        const { data: member, error: memberError } = await supabase
            .from('org_members')
            .select('*, organizations (name)')
            .eq('user_id', user.id)
            .single();

        if (memberError || !member) {
            console.error("Member query error in /me:", memberError);
            return NextResponse.json({ error: "No organization membership found" }, { status: 404 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        // 3. Get module permissions
        const { data: access, error: accessError } = await supabase
            .from('member_module_access')
            .select('module, can_view, can_edit, can_delete')
            .eq('member_id', member.id);

        if (accessError) {
            console.error("Permissions query error in /me:", accessError);
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                full_name: profile?.full_name,
            },
            organization: member.organizations,
            role: member.role,
            permissions: access || []
        });
    } catch (e: any) {
        console.error("Fatal error in /me route:", e.message);
        return NextResponse.json({ error: "Internal Server Error", details: e.message }, { status: 500 });
    }
}
