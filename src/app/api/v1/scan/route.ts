import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";
import { mockPacks, mockMovements, addMockMovement } from "@/lib/demo/data";

// POST /api/v1/scan — Process a barcode scan (movement)
const scanSchema = z.object({
    codigo: z.string().min(1).trim(),
    type: z.enum(["SALIDA", "ENTRADA", "AJUSTE"]),
    school_id: z.string().nullable().optional().or(z.literal("undefined").transform(() => null)),
    school_name: z.string().optional().nullable(),
    applicator_id: z.string().nullable().optional().or(z.literal("undefined").transform(() => null)),
    applicator_name: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = scanSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { codigo, type, school_id, school_name, applicator_id, applicator_name, notes } = parsed.data;

        // DEMO MODE
        if (DEMO_MODE) {
            const pack = mockPacks.find((p) => p.codigo === codigo && !p.deleted_at);
            if (!pack) {
                return NextResponse.json({ error: "Pack not found", codigo }, { status: 404 });
            }

            // Validate state transitions
            if (type === "SALIDA" && pack.status !== "EN_SITIO") {
                return NextResponse.json({ error: `Cannot checkout: pack is not EN_SITIO (current: ${pack.status})` }, { status: 400 });
            }
            if (type === "ENTRADA" && pack.status !== "PRESTADO") {
                return NextResponse.json({ error: `Cannot checkin: pack is not PRESTADO (current: ${pack.status})` }, { status: 400 });
            }

            const previousStatus = pack.status;
            let newStatus: "EN_SITIO" | "PRESTADO";

            if (type === "SALIDA") newStatus = "PRESTADO";
            else if (type === "ENTRADA") newStatus = "EN_SITIO";
            else newStatus = pack.status === "EN_SITIO" ? "PRESTADO" : "EN_SITIO";

            // Update pack in-memory
            pack.status = newStatus;
            pack.current_school_id = type === "SALIDA" ? (school_id || null) : type === "ENTRADA" ? null : pack.current_school_id;
            pack.current_applicator_id = type === "SALIDA" ? (applicator_id || null) : type === "ENTRADA" ? null : pack.current_applicator_id;
            pack.updated_at = new Date().toISOString();

            const movement = addMockMovement({
                pack_id: pack.id,
                type,
                school_id: school_id || null,
                school_name: school_name || null,
                applicator_id: applicator_id || null,
                applicator_name: applicator_name || null,
                previous_status: previousStatus,
                new_status: newStatus,
                notes: notes || null,
            });

            return NextResponse.json({
                success: true,
                pack: { id: pack.id, codigo: pack.codigo, nombre: pack.nombre },
                movement: { success: true, movement_id: movement.id, previous_status: previousStatus, new_status: newStatus },
            });
        }

        // REAL MODE
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const { data: pack } = await supabase
            .from("packs")
            .select("id, status, codigo, nombre")
            .eq("org_id", member.org_id)
            .eq("codigo", codigo)
            .is("deleted_at", null)
            .single();

        if (!pack) return NextResponse.json({ error: "Pack not found", codigo }, { status: 404 });

        const { data: result, error: rpcError } = await supabase.rpc("create_movement_and_update_pack", {
            p_org_id: member.org_id,
            p_pack_id: pack.id,
            p_type: type,
            p_school_id: school_id || null,
            p_school_name: school_name || null,
            p_applicator_id: applicator_id || null,
            p_applicator_name: applicator_name || null,
            p_notes: notes || null,
        });

        if (rpcError) {
            return NextResponse.json({ error: rpcError.message || "Movement failed" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            pack: { id: pack.id, codigo: pack.codigo, nombre: pack.nombre },
            movement: result,
        });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET /api/v1/scan?codigo=... — Look up a pack by barcode
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const codigo = url.searchParams.get("codigo")?.trim();
        if (!codigo) return NextResponse.json({ error: "Missing codigo parameter" }, { status: 400 });

        // DEMO MODE
        if (DEMO_MODE) {
            const pack = mockPacks.find((p) => p.codigo === codigo && !p.deleted_at);
            if (!pack) return NextResponse.json({ error: "Pack not found", codigo }, { status: 404 });

            const movements = mockMovements
                .filter((m) => m.pack_id === pack.id)
                .slice(0, 5);

            return NextResponse.json({ pack, movements });
        }

        // REAL MODE
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        const { data: pack } = await supabase
            .from("packs")
            .select("*")
            .eq("org_id", member.org_id)
            .eq("codigo", codigo)
            .is("deleted_at", null)
            .single();

        if (!pack) return NextResponse.json({ error: "Pack not found", codigo }, { status: 404 });

        const { data: movements } = await supabase
            .from("movements")
            .select("*")
            .eq("pack_id", pack.id)
            .order("created_at", { ascending: false })
            .limit(5);

        return NextResponse.json({ pack, movements: movements || [] });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
