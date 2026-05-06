import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const url = new URL(req.url);
    const periodId = url.searchParams.get("periodId");

    if (periodId) {
        const { data: period, error: pError } = await supabase
            .from("payroll_periods")
            .select("*")
            .eq("id", periodId)
            .eq("org_id", member.org_id)
            .single();

        if (pError) throw pError;
        if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

        const { data: entries, error: eError } = await supabase
            .from("payroll_entries")
            .select("*")
            .eq("period_id", periodId)
            .eq("org_id", member.org_id);

        if (eError) throw eError;

        // Fetch roles from line items to provide context
        const entryIds = entries.map((e: any) => e.id);
        const { data: lineItems, error: liError } = await supabase
            .from("payroll_line_items")
            .select("entry_id, role, source")
            .in("entry_id", entryIds)
            .eq("org_id", member.org_id);
        if (liError) throw liError;

        // Group roles by entry
        const entriesWithRoles = entries.map((entry: any) => {
            const items = (lineItems ?? []).filter((li: any) => li.entry_id === entry.id);
            const roles = Array.from(
                new Set(items.map((li: any) => li.role).filter(Boolean))
            );
            const sources = Array.from(
                new Set(items.map((li: any) => li.source).filter(Boolean))
            );
            const manual_lines_count = items.filter((li: any) => li.source === "manual").length;
            const auto_lines_count = items.filter((li: any) => li.source === "auto_event_staff").length;
            return {
                ...entry,
                roles,
                sources,
                manual_lines_count,
                auto_lines_count,
            };
        });

        return NextResponse.json({ period, entries: entriesWithRoles });
    }

    const { data: periods, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("org_id", member.org_id)
        .order("start_date", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ periods, total: periods.length });
}, { module: "payroll", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const { periodId } = await req.json();

    if (!periodId) {
        return NextResponse.json({ error: "periodId is required" }, { status: 400 });
    }

    // Call the new Phase 3 calculation engine
    const { data, error } = await supabase.rpc("fn_calculate_payroll_for_period", {
        p_period_id: periodId
    });

    if (error) throw error;

    // Audit log
    await logAudit(supabase, {
        org_id: member.org_id,
        table_name: "payroll_periods",
        record_id: periodId,
        action: "UPDATE",
        notes: "Payroll recalculated using dynamic engine",
        performed_by: user.id,
    });

    return NextResponse.json({ result: data });
}, { module: "payroll", action: "edit" });

async function logAudit(supabase: any, data: any) {
    // Basic audit logger helper if needed
    const { error } = await supabase.from("audit_logs").insert(data);
    if (error) console.error("Audit log error:", error);
}
