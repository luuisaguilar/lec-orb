"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function acceptApplicatorPortalInvitation(formData: FormData) {
    const token = formData.get("token")?.toString();

    if (!token) {
        redirect("/login");
    }

    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
        redirect(`/login?next=/join-portal/${token}`);
    }

    let adminClient;
    try {
        adminClient = createAdminClient();
    } catch (e) {
        console.error("[join-portal] Admin client unavailable:", e);
        redirect(
            `/join-portal/${token}?error=${encodeURIComponent(
                "Error de configuración del servidor. Contacta al administrador."
            )}`
        );
    }

    const { data: result, error: rpcError } = await adminClient.rpc(
        "fn_accept_applicator_portal_invitation",
        {
            p_token: token,
            p_user_id: user.id,
            p_user_email: user.email,
        }
    );

    if (rpcError) {
        console.error("[join-portal] RPC error:", rpcError.message, rpcError.code);
        redirect(
            `/join-portal/${token}?error=${encodeURIComponent(
                "Ocurrió un error al vincular tu cuenta. Intenta de nuevo o contacta al administrador."
            )}`
        );
    }

    const { success, message, code } = result as {
        success: boolean;
        message?: string;
        code?: string;
    };

    if (!success) {
        const expiredFlag = code === "EXPIRED" ? "&expired=1" : "";
        redirect(
            `/join-portal/${token}?error=${encodeURIComponent(message || "No se pudo completar el acceso.")}${expiredFlag}`
        );
    }

    redirect("/portal");
}
