import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const [
        { count: totalApplicators },
        { count: totalSchools },
        { data: events },
        { data: sessions },
        { count: cenniTotal },
        { data: cenniByStatus },
        { data: applicatorsByZone },
        { data: eventsByStatus },
        { data: examTypes },
    ] = await Promise.all([
        supabase.from("applicators").select("id", { count: "exact", head: true }).eq("org_id", member.org_id).is("deleted_at", null),
        supabase.from("schools").select("id", { count: "exact", head: true }).eq("org_id", member.org_id).is("deleted_at", null),
        supabase.from("events").select("id, status, date").eq("org_id", member.org_id).is("deleted_at", null),
        supabase.from("event_sessions").select("id, exam_type, date, event:events!inner(org_id)").eq("event.org_id", member.org_id),
        supabase.from("cenni_cases").select("id", { count: "exact", head: true }).eq("org_id", member.org_id).is("deleted_at", null),
        supabase.from("cenni_cases").select("estatus").eq("org_id", member.org_id).is("deleted_at", null),
        supabase.from("applicators").select("location_zone").eq("org_id", member.org_id).is("deleted_at", null),
        supabase.from("events").select("status").eq("org_id", member.org_id).is("deleted_at", null),
        supabase.from("event_sessions").select("exam_type, event:events!inner(org_id)").eq("event.org_id", member.org_id),
    ]);

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);

    const eventsThisMonth = (events || []).filter((e: { date?: string }) =>
        e.date?.startsWith(thisMonth)
    ).length;

    const upcoming = (events || []).filter((e: { status: string; date?: string }) => {
        if (e.status !== "PUBLISHED") return false;
        return e.date ? new Date(e.date) >= now : false;
    }).length;

    const eventStatusCounts: Record<string, number> = {};
    (eventsByStatus || []).forEach((e: { status: string }) => {
        eventStatusCounts[e.status] = (eventStatusCounts[e.status] || 0) + 1;
    });

    const examTypeCounts: Record<string, number> = {};
    (examTypes || []).forEach((s: { exam_type?: string }) => {
        if (s.exam_type) examTypeCounts[s.exam_type] = (examTypeCounts[s.exam_type] || 0) + 1;
    });

    const cenniStatusCounts: Record<string, number> = {};
    (cenniByStatus || []).forEach((r: { estatus?: string }) => {
        if (r.estatus) cenniStatusCounts[r.estatus] = (cenniStatusCounts[r.estatus] || 0) + 1;
    });

    const zoneCounts: Record<string, number> = {};
    (applicatorsByZone || []).forEach((a: { location_zone?: string }) => {
        const z = a.location_zone || "Sin zona";
        zoneCounts[z] = (zoneCounts[z] || 0) + 1;
    });

    return NextResponse.json({
        general: {
            totalApplicators: totalApplicators || 0,
            totalSchools: totalSchools || 0,
            totalSessions: sessions?.length || 0,
            eventsThisMonth,
            upcomingEvents: upcoming,
            cenniTotal: cenniTotal || 0,
        },
        events: {
            byStatus: eventStatusCounts,
            byExamType: examTypeCounts,
        },
        applicators: {
            byZone: zoneCounts,
            total: totalApplicators || 0,
        },
        cenni: {
            byStatus: cenniStatusCounts,
            total: cenniTotal || 0,
        },
    });
}, { module: "dashboard", action: "view" });
