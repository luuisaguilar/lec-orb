'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function acceptInvitation(formData: FormData) {
    const token = formData.get("token")?.toString();

    if (!token) {
        throw new Error("Token de invitación faltante.");
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
        console.error("RPC Error processing invitation:", rpcError);
        throw new Error("Ocurrió un error inesperado al procesar tu invitación.");
    }

    const { success, message } = result as any;

    if (!success) {
        redirect(`/join/${token}?error=${encodeURIComponent(message || "No se pudo aceptar la invitación.")}`);
    }

    // 3. Success — redirect to dashboard
    redirect("/dashboard");
}
