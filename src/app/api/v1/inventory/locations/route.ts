import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { data, error } = await supabase
        .from('inventory_locations')
        .select('*')
        .eq('org_id', member.org_id)
        .eq('is_active', true)
        .order('name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}, { module: "inventory", action: "view" });

export const POST = withAuth(async (req, { supabase, member }) => {
    const body = await req.json();
    const { data, error } = await supabase
        .from('inventory_locations')
        .insert({ ...body, org_id: member.org_id })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}, { module: "inventory", action: "edit" });
