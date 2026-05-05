import { NextResponse } from "next/server";

type SgcDbError = {
    code?: string;
    message?: string;
};

export function canMutateSgc(role: string): boolean {
    return role === "admin" || role === "supervisor";
}

export function forbiddenSgcMutation() {
    return NextResponse.json(
        { error: "Insufficient permissions for SGC mutation" },
        { status: 403 },
    );
}

export function mapSgcDbError(error: SgcDbError | null | undefined, fallback = "Unexpected SGC error") {
    const code = error?.code ?? "";
    const message = error?.message ?? fallback;
    const normalized = message.toLowerCase();

    if (code === "23505") {
        return NextResponse.json(
            { error: "Duplicate value for this organization." },
            { status: 409 },
        );
    }

    if (normalized.includes("evaluation_comments is required")) {
        return NextResponse.json(
            { error: "No se puede cerrar la no conformidad sin evaluacion final." },
            { status: 409 },
        );
    }

    if (normalized.includes("all linked actions must be done")) {
        return NextResponse.json(
            { error: "No se puede cerrar la no conformidad con acciones pendientes." },
            { status: 409 },
        );
    }

    if (normalized.includes("cannot return to draft")) {
        return NextResponse.json(
            { error: "No se puede regresar una accion a borrador despues de abrirla." },
            { status: 409 },
        );
    }

    if (normalized.includes("invalid action stage") || normalized.includes("invalid nonconformity stage")) {
        return NextResponse.json(
            { error: "La etapa seleccionada no pertenece a la organizacion." },
            { status: 400 },
        );
    }

    if (normalized.includes("foreign key")) {
        return NextResponse.json(
            { error: "Uno o mas IDs relacionados no son validos para esta organizacion." },
            { status: 400 },
        );
    }

    return NextResponse.json({ error: message }, { status: 500 });
}

export function parsePagination(url: string, defaultLimit = 50, maxLimit = 200) {
    const { searchParams } = new URL(url);
    const limit = Math.min(
        parseInt(searchParams.get("limit") ?? String(defaultLimit), 10) || defaultLimit,
        maxLimit,
    );
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
    const offset = (page - 1) * limit;

    return { searchParams, limit, page, offset };
}

export function buildSgcRef(prefix: "NC" | "ACT" | "AUD" | "REV"): string {
    const year = new Date().getFullYear();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    return `${prefix}-${year}-${token}`;
}
