import { NextResponse } from "next/server";
import { z } from "zod";
import { withApplicatorAuth } from "@/lib/auth/with-applicator";

const bodySchema = z.object({
    action: z.enum(["accept", "decline"]),
});

type RouteCtx = { params: Promise<{ staffId: string }> };

export const POST = withApplicatorAuth(async (req, { supabase }, routeCtx: RouteCtx) => {
    const { staffId } = await routeCtx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success || !staffId) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("fn_ack_event_staff_assignment", {
        p_staff_id: staffId,
        p_action: parsed.data.action,
    });

    if (error) {
        console.error("[portal/event-assignments/ack] RPC:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data as {
        success?: boolean;
        message?: string;
        code?: string;
        acknowledgment_status?: string;
    };

    if (!result?.success) {
        const code = result?.code ?? "UNKNOWN";
        const msg = result?.message ?? "No se pudo actualizar.";
        if (code === "NOT_PENDING" || code === "INVALID_ACTION") {
            return NextResponse.json({ error: msg, code }, { status: 409 });
        }
        if (code === "FORBIDDEN" || code === "NOT_APPLICATOR") {
            return NextResponse.json({ error: msg, code }, { status: 403 });
        }
        if (code === "NOT_FOUND") {
            return NextResponse.json({ error: msg, code }, { status: 404 });
        }
        return NextResponse.json({ error: msg, code }, { status: 400 });
    }

    return NextResponse.json({
        ok: true,
        acknowledgment_status: result.acknowledgment_status,
    });
});
