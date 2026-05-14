'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function acceptInvitation(formData: FormData) {
    const token = formData.get("token")?.toString();

    if (!token) {
        redirect("/login");
    }

    // 1. Get current authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
        redirect(`/login?next=/join/${token}`);
    }

    // 2. Call the Atomic RPC via Admin Client
    let adminClient;
    try {
        adminClient = createAdminClient();
    } catch (e) {
        console.error("[join] Admin client unavailable:", e);
        redirect(`/join/${token}?error=${encodeURIComponent("Error de configuración del servidor. Contacta al administrador.")}`);
    }

    const { data: result, error: rpcError } = await adminClient.rpc('fn_accept_invitation', {
        p_token: token,
        p_user_id: user.id,
        p_user_email: user.email,
    });

    if (rpcError) {
        // Never throw from a Server Action — redirect with the error message instead
        console.error("[join] RPC error on fn_accept_invitation:", rpcError.message, rpcError.code);
        redirect(`/join/${token}?error=${encodeURIComponent("Ocurrió un error al procesar tu invitación. Intenta de nuevo o contacta al administrador.")}`);
    }

    const { success, message, code, role: acceptedRole } = result as { success: boolean; message?: string; code?: string; role?: string };

    if (!success) {
        // EXPIRED gets a query flag so the page can render a "request a new invite" CTA
        const expiredFlag = code === "EXPIRED" ? "&expired=1" : "";
        redirect(`/join/${token}?error=${encodeURIComponent(message || "No se pudo aceptar la invitación.")}${expiredFlag}`);
    }

    // 3. Success — redirect to the correct entry point based on role
    if (acceptedRole === 'applicator') {
        redirect("/portal");
    }
    redirect("/dashboard");
}

export async function signOutForInvite(formData: FormData) {
    const token = formData.get("token")?.toString() ?? "";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(`/join/${token}`);
}
