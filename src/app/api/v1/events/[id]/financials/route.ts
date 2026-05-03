import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member, params }) => {
    const { id: eventId } = await params;

    // 1. Get Payroll Costs for this event
    const { data: payrollItems, error: pError } = await supabase
        .from("payroll_line_items")
        .select(`
            total_amount, 
            role, 
            payroll_entries (
                applicator_id
            )
        `)
        .eq("event_id", eventId)
        .eq("org_id", member.org_id);

    if (pError) throw pError;

    const totalStaffCost = payrollItems?.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0) || 0;

    // 2. Get Event Basic Info for context (if needed)
    const { data: event, error: eError } = await supabase
        .from("events")
        .select("title, status")
        .eq("id", eventId)
        .single();

    if (eError) throw eError;

    // 3. Placeholder for Incomes (to be integrated with IH Billing later)
    const estimatedIncome = 0; 

    return NextResponse.json({
        summary: {
            totalStaffCost,
            estimatedIncome,
            netProfit: estimatedIncome - totalStaffCost,
            staffCount: new Set(payrollItems?.map(i => (i.payroll_entries as any)?.applicator_id)).size
        },
        breakdown: payrollItems
    });
}, { module: "events", action: "view" });
