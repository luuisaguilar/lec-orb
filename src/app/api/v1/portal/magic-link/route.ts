import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConfiguredAppOrigin } from "@/lib/env/app-url";

const bodySchema = z.object({
    email: z.string().email(),
    invitationToken: z.string().min(16),
});

/**
 * Sends a Supabase magic link only when email matches a pending applicator portal invitation.
 * Avoids open email enumeration beyond "check your inbox" messaging.
 */
export async function POST(req: Request) {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { email, invitationToken } = parsed.data;

    let admin;
    try {
        admin = createAdminClient();
    } catch {
        return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500 });
    }

    const { data: invitation, error: invErr } = await admin
        .from("applicator_portal_invitations")
        .select("id, email, status, expires_at")
        .eq("token", invitationToken)
        .single();

    if (invErr || !invitation || invitation.status !== "pending") {
        return NextResponse.json({ ok: true, message: "Si el correo coincide, recibirás un enlace." });
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json({ ok: true, message: "Si el correo coincide, recibirás un enlace." });
    }

    if (
        (invitation.email as string).trim().toLowerCase() !== email.trim().toLowerCase()
    ) {
        return NextResponse.json({ ok: true, message: "Si el correo coincide, recibirás un enlace." });
    }

    const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const origin = getConfiguredAppOrigin() ?? new URL(req.url).origin;
    const nextPath = `/join-portal/${invitationToken}`;
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error: otpError } = await supabaseAnon.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo },
    });

    if (otpError) {
        console.error("[portal/magic-link] signInWithOtp:", otpError.message);
        return NextResponse.json(
            { error: "No se pudo enviar el enlace. Intenta de nuevo más tarde." },
            { status: 500 }
        );
    }

    return NextResponse.json({
        ok: true,
        message: "Revisa tu correo para el enlace de acceso.",
    });
}
