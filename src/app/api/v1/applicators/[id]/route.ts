import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await request.json();

        const { error } = await supabase
            .from("applicators")
            .update(body)
            .eq("id", id)
            .eq("org_id", member.org_id);

        if (error) {
            console.error("Update error:", error);
            return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const resolvedParams = await params;
        const id = resolvedParams.id;

        const { error } = await supabase
            .from("applicators")
            .delete()
            .eq("id", id)
            .eq("org_id", member.org_id);

        if (error) {
            console.error("Delete error:", error);
            return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
