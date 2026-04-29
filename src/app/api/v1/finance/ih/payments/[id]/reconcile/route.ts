import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { z } from "zod";

// Reconciliación manual: el usuario especifica sesiones + montos
// Reconciliación auto:   el sistema sugiere sesiones que cuadran con el monto del pago

const ManualSchema = z.object({
    mode: z.literal("manual"),
    allocations: z.array(z.object({
        session_id:    z.string().uuid(),
        students_paid: z.number().int().min(0),
        amount:        z.number().positive(),
    })).min(1),
});

const AutoSchema = z.object({
    mode: z.literal("auto"),
});

const ReconcileSchema = z.discriminatedUnion("mode", [ManualSchema, AutoSchema]);

export const POST = withAuth(async (req, { supabase, user, member }, { params }) => {
    const { id } = await params;
    const body   = await req.json();
    const parsed = ReconcileSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Verificar que el pago existe y pertenece al org
    const { data: payment } = await supabase
        .from("ih_payments")
        .select("*")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();
    if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

    if (parsed.data.mode === "auto") {
        // Modo auto: sugerir sesiones PENDING de la misma región
        const { data: pending } = await supabase
            .from("ih_sessions")
            .select("id, school_name, exam_type, session_date, subtotal_lec, balance")
            .eq("org_id", member.org_id)
            .eq("region", payment.region)
            .eq("status", "PENDING")
            .order("session_date", { ascending: true });

        // Algoritmo greedy: cubrir sesiones completas en orden cronológico
        const suggestions: { session_id: string; school_name: string; exam_type: string; session_date: string; amount: number; students_paid: number }[] = [];
        let remaining = Number(payment.amount);

        for (const s of pending ?? []) {
            if (remaining <= 0) break;
            const balance = Number(s.balance ?? s.subtotal_lec);
            if (balance <= 0) continue;
            const apply = Math.min(remaining, balance);
            suggestions.push({
                session_id:    s.id,
                school_name:   s.school_name,
                exam_type:     s.exam_type,
                session_date:  s.session_date,
                amount:        apply,
                students_paid: apply >= balance ? s.students_applied : 0,
            });
            remaining -= apply;
        }

        return NextResponse.json({ suggestions, unallocated: remaining });
    }

    // Modo manual: aplicar las asignaciones
    const { allocations } = parsed.data;
    const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);

    for (const alloc of allocations) {
        const { data: session } = await supabase
            .from("ih_sessions")
            .select("id, org_id, amount_paid_ih, students_paid_ih, subtotal_lec")
            .eq("id", alloc.session_id)
            .eq("org_id", member.org_id)
            .single();

        if (!session) continue;

        const newAmount   = Number(session.amount_paid_ih ?? 0) + alloc.amount;
        const newStudents = Number(session.students_paid_ih ?? 0) + alloc.students_paid;
        const subtotal    = Number(session.subtotal_lec ?? 0);
        const newStatus   = newAmount >= subtotal
            ? (alloc.students_paid !== session.students_applied ? "PAID_DIFF" : "PAID")
            : "PAID_DIFF";

        await supabase.from("ih_sessions").update({
            amount_paid_ih:   newAmount,
            students_paid_ih: newStudents,
            status:           newStatus,
            updated_at:       new Date().toISOString(),
        }).eq("id", alloc.session_id);

        // Registrar en junction table (upsert en caso de re-conciliación)
        await supabase.from("ih_payment_sessions").upsert({
            org_id:         member.org_id,
            payment_id:     id,
            session_id:     alloc.session_id,
            students_paid:  alloc.students_paid,
            amount_applied: alloc.amount,
        }, { onConflict: "payment_id,session_id" });
    }

    await logAudit(supabase, {
        org_id: member.org_id, table_name: "ih_payments", record_id: id,
        action: "UPDATE",
        new_data: { mode: "manual", allocations: allocations.length, total: totalAllocated },
        performed_by: user.id,
    });

    return NextResponse.json({ ok: true, allocated: allocations.length, total: totalAllocated });
}, { module: "finanzas", action: "edit" });
