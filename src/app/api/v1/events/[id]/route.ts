import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkServerPermission } from "@/lib/auth/permissions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
        if (!member) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const canView = await checkServerPermission(supabase, user.id, "eventos", "view");
        if (!canView) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

        // Await params in next 15
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const { data: event, error } = await supabase
            .from("events")
            .select(`
                *,
                school:schools(*),
                sessions:event_sessions(*),
                staff:event_staff(
                    id, role, session_id, applicator_id,
                    applicator:applicators(*)
                ),
                slots:event_slots(*)
            `)
            .eq("id", id)
            .eq("org_id", member.org_id)
            .single();

        if (error || !event) {
            console.error("Event fetch error:", error);
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Sort slots by slot_number
        if (event.slots) {
            event.slots.sort((a: any, b: any) => a.slot_number - b.slot_number);
        }

        return NextResponse.json({ event });
    } catch (err: any) {
        console.error("Event server error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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

        // Update event details
        // Keep status update capability but allow other fields
        const updateData = { ...body };
        delete updateData.id;
        delete updateData.org_id;

        const { error } = await supabase
            .from("events")
            .update(updateData)
            .eq("id", id)
            .eq("org_id", member.org_id);

        if (error) {
            console.error("Event update error:", error);
            return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Event patch error:", err);
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
            .from("events")
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
