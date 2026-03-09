import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo/config";
import { mockPacks, addMockPack } from "@/lib/demo/data";
import { checkServerPermission } from "@/lib/auth/permissions";

// GET /api/v1/packs — List packs for the user's org
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const search = url.searchParams.get("search") || "";
        const status = url.searchParams.get("status") || "";

        // DEMO MODE
        if (DEMO_MODE) {
            let filtered = mockPacks.filter((p) => !p.deleted_at);
            if (search) {
                const s = search.toLowerCase();
                filtered = filtered.filter(
                    (p) =>
                        p.codigo.toLowerCase().includes(s) ||
                        p.nombre.toLowerCase().includes(s)
                );
            }
            if (status === "EN_SITIO" || status === "PRESTADO") {
                filtered = filtered.filter((p) => p.status === status);
            }
            return NextResponse.json({
                packs: filtered,
                total: filtered.length,
                page: 1,
                limit: 50,
            });
        }

        // REAL MODE
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        const canView = await checkServerPermission(supabase, user.id, "inventario", "view");
        if (!canView) {
            return NextResponse.json({ error: "Insufficient permissions to view" }, { status: 403 });
        }

        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        let query = supabase
            .from("packs")
            .select(`
                *,
                school:schools(id, name),
                applicator:applicators(id, name)
            `, { count: "exact" })
            .eq("org_id", member.org_id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (search) {
            query = query.or(`codigo.ilike.%${search}%,nombre.ilike.%${search}%`);
        }

        if (status === "EN_SITIO" || status === "PRESTADO") {
            query = query.eq("status", status);
        }

        const { data: packs, count, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: "Failed to fetch packs" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            packs: packs || [],
            total: count || 0,
            page,
            limit,
        });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/v1/packs — Create a new pack
const createPackSchema = z.object({
    codigo: z.string().min(1).trim(),
    nombre: z.string().optional().default(""),
    status: z.enum(["EN_SITIO", "PRESTADO"]).default("EN_SITIO"),
    school_id: z.string().uuid().optional().nullable(),
    applicator_id: z.string().uuid().optional().nullable(),
    notes: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createPackSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 }
            );
        }
        const { codigo, nombre, notes } = parsed.data;

        // DEMO MODE
        if (DEMO_MODE) {
            // Check duplicate
            if (mockPacks.some((p) => p.codigo === codigo && !p.deleted_at)) {
                return NextResponse.json(
                    { error: "A pack with this code already exists" },
                    { status: 409 }
                );
            }
            const pack = addMockPack({
                codigo,
                nombre: nombre || "",
                status: "EN_SITIO",
                current_school_id: null,
                current_applicator_id: null,
                notes: notes || null,
            });
            return NextResponse.json({ pack }, { status: 201 });
        }

        // REAL MODE
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (!member) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        const canEdit = await checkServerPermission(supabase, user.id, "inventario", "edit");
        if (!canEdit) {
            return NextResponse.json(
                { error: "Insufficient permissions to create packs" },
                { status: 403 }
            );
        }

        const statusToSet = parsed.data.status || "EN_SITIO";

        // Provide fallback timestamps if setting initial status
        const now = new Date();
        const timeString = new Intl.DateTimeFormat('es-MX', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(now);
        const dateString = new Intl.DateTimeFormat('fr-CA', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(now);

        const { data: pack, error } = await supabase
            .from("packs")
            .insert({
                org_id: member.org_id,
                codigo,
                nombre,
                notes,
                status: statusToSet,
                school_id: parsed.data.school_id || null,
                applicator_id: parsed.data.applicator_id || null,
                fecha: dateString,
                hora_salida: statusToSet === "PRESTADO" ? timeString : null,
                hora_entrada: statusToSet === "EN_SITIO" ? timeString : null,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "A pack with this code already exists" },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { error: "Failed to create pack" },
                { status: 500 }
            );
        }



        return NextResponse.json({ pack }, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
