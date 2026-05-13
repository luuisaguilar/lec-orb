import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { addDays, formatISO } from "date-fns";

export interface ActionItem {
    id: string;
    type: "event" | "cenni" | "crm" | "staff";
    urgency: "high" | "medium" | "low";
    title: string;
    subtitle: string;
    href: string;
    meta?: string; // e.g. "Vence 15 may"
}

export const GET = withAuth(async (_req, { supabase, member }) => {
    const now = new Date();
    const in30Days = formatISO(addDays(now, 30));
    const todayISO = formatISO(now, { representation: "date" });

    const [
        { data: draftEvents },
        { data: upcomingEvents },
        { data: cenniPending },
        { data: crmProspects },
    ] = await Promise.all([
        // Events still in DRAFT within the next 30 days
        supabase
            .from("events")
            .select("id, title, date, school:schools(name)")
            .eq("org_id", member.org_id)
            .eq("status", "DRAFT")
            .lte("date", in30Days)
            .is("deleted_at", null)
            .order("date", { ascending: true })
            .limit(10),

        // Published events in next 14 days — check staff coverage
        supabase
            .from("events")
            .select(`
                id, title, date,
                school:schools(name),
                staff:event_staff(id)
            `)
            .eq("org_id", member.org_id)
            .eq("status", "PUBLISHED")
            .gte("date", todayISO)
            .lte("date", formatISO(addDays(now, 14), { representation: "date" }))
            .is("deleted_at", null)
            .order("date", { ascending: true })
            .limit(10),

        // CENNI cases that need action
        supabase
            .from("cenni_cases")
            .select("id, folio_cenni, cliente_estudiante, estatus, created_at")
            .eq("org_id", member.org_id)
            .in("estatus", ["EN OFICINA", "ENVIADO A SEP", "EN PROCESO"])
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
            .limit(10),

        // CRM prospects in early pipeline stages that need follow-up
        supabase
            .from("crm_prospects")
            .select("id, name, company, service_interest, status, next_followup_at, created_at")
            .eq("org_id", member.org_id)
            .in("status", ["nuevo", "contactado", "calificado"])
            .order("next_followup_at", { ascending: true, nullsFirst: true })
            .limit(15),
    ]);

    const items: ActionItem[] = [];

    // ── Draft events ────────────────────────────────────────────────────────────
    for (const ev of draftEvents ?? []) {
        const daysUntil = Math.ceil(
            (new Date(ev.date).getTime() - now.getTime()) / 86_400_000
        );
        items.push({
            id: `draft-${ev.id}`,
            type: "event",
            urgency: daysUntil <= 7 ? "high" : daysUntil <= 14 ? "medium" : "low",
            title: ev.title,
            subtitle: `Evento en borrador — ${(ev.school as any)?.name ?? "Sin sede"}`,
            href: `/dashboard/eventos/planner/${ev.id}`,
            meta: `En ${daysUntil} día${daysUntil === 1 ? "" : "s"}`,
        });
    }

    // ── Upcoming events without staff ────────────────────────────────────────────
    for (const ev of upcomingEvents ?? []) {
        const staffCount = Array.isArray((ev as any).staff) ? (ev as any).staff.length : 0;
        if (staffCount === 0) {
            const daysUntil = Math.ceil(
                (new Date(ev.date).getTime() - now.getTime()) / 86_400_000
            );
            items.push({
                id: `staff-${ev.id}`,
                type: "staff",
                urgency: daysUntil <= 5 ? "high" : "medium",
                title: ev.title,
                subtitle: `Sin staff asignado — ${(ev.school as any)?.name ?? "Sin sede"}`,
                href: `/dashboard/eventos/planner/${ev.id}`,
                meta: `En ${daysUntil} día${daysUntil === 1 ? "" : "s"}`,
            });
        }
    }

    // ── CENNI pending ────────────────────────────────────────────────────────────
    for (const c of cenniPending ?? []) {
        const daysPending = Math.ceil(
            (now.getTime() - new Date(c.created_at).getTime()) / 86_400_000
        );
        items.push({
            id: `cenni-${c.id}`,
            type: "cenni",
            urgency: daysPending >= 30 ? "high" : daysPending >= 14 ? "medium" : "low",
            title: c.cliente_estudiante,
            subtitle: `CENNI ${c.folio_cenni} — ${c.estatus}`,
            href: `/dashboard/cenni`,
            meta: `${daysPending} día${daysPending === 1 ? "" : "s"} en proceso`,
        });
    }

    // ── CRM prospects needing follow-up ─────────────────────────────────────────
    const STATUS_LABELS: Record<string, string> = {
        nuevo: "Nuevo", contactado: "Contactado", calificado: "Calificado",
    };
    for (const p of crmProspects ?? []) {
        const followup = p.next_followup_at ? new Date(p.next_followup_at) : null;
        const isOverdue = followup && followup < now;
        const noFollowup = !followup;
        const daysSinceCreated = Math.ceil((now.getTime() - new Date(p.created_at).getTime()) / 86_400_000);

        let urgency: "high" | "medium" | "low" = "low";
        if (isOverdue) urgency = "high";
        else if (noFollowup && daysSinceCreated > 3) urgency = "medium";

        items.push({
            id: `crm-${p.id}`,
            type: "crm",
            urgency,
            title: p.name,
            subtitle: isOverdue
                ? `Seguimiento vencido — ${STATUS_LABELS[p.status] ?? p.status}`
                : noFollowup
                    ? `Sin seguimiento programado — ${STATUS_LABELS[p.status] ?? p.status}`
                    : `${STATUS_LABELS[p.status] ?? p.status}${p.company ? ` — ${p.company}` : ""}`,
            href: `/dashboard/crm/prospectos`,
            meta: p.service_interest ?? p.company ?? undefined,
        });
    }

    // Sort: high → medium → low
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return NextResponse.json({
        items,
        counts: {
            total: items.length,
            high: items.filter((i) => i.urgency === "high").length,
            medium: items.filter((i) => i.urgency === "medium").length,
            low: items.filter((i) => i.urgency === "low").length,
        },
    });
}, { module: "dashboard", action: "view" });
