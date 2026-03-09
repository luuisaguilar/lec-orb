import { createClient as createServerClient } from "@/lib/supabase/server";

interface SendNotificationParams {
    userId: string;
    orgId: string;
    title: string;
    body?: string;
    link?: string;
    type?: "info" | "warning" | "success" | "action_required";
    moduleSlug?: string;
}

/**
 * Send an in-app notification to a user.
 * Can be called from any API route or server action.
 *
 * @example
 * await sendNotification({
 *   userId: assignedUser.id,
 *   orgId: member.org_id,
 *   title: "Se te asignó una sesión",
 *   body: "Evento: TOEFL Centro, 15 de marzo",
 *   link: "/dashboard/eventos/planner/abc123",
 *   moduleSlug: "events",
 * });
 */
export async function sendNotification({
    userId,
    orgId,
    title,
    body,
    link,
    type = "info",
    moduleSlug,
}: SendNotificationParams) {
    try {
        const supabase = await createServerClient();
        await supabase.from("notifications").insert({
            user_id: userId,
            org_id: orgId,
            title,
            body,
            link,
            type,
            module_slug: moduleSlug,
        });
    } catch (err) {
        // Silent fail — notifications should never break the main flow
        console.error("[notifications] Failed to send:", err);
    }
}

/**
 * Send a notification from a template (with variable interpolation).
 *
 * @example
 * await sendFromTemplate({
 *   userId: user.id,
 *   orgId: member.org_id,
 *   templateSlug: "event_assigned",
 *   variables: { event_name: "TOEFL Centro", date: "15/03/2026" },
 *   link: "/dashboard/eventos/planner/abc123",
 * });
 */
export async function sendFromTemplate({
    userId,
    orgId,
    templateSlug,
    variables = {},
    link,
}: {
    userId: string;
    orgId: string;
    templateSlug: string;
    variables?: Record<string, string>;
    link?: string;
}) {
    try {
        const supabase = await createServerClient();
        const { data: template } = await supabase
            .from("notification_templates")
            .select("title_tmpl, body_tmpl, type")
            .or(`org_id.is.null,org_id.eq.${orgId}`)
            .eq("slug", templateSlug)
            .limit(1)
            .single();

        if (!template) {
            console.warn(`[notifications] Template "${templateSlug}" not found`);
            return;
        }

        // Interpolate {{variable}} placeholders
        const interpolate = (tmpl: string, vars: Record<string, string>) =>
            tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");

        await sendNotification({
            userId,
            orgId,
            title: interpolate(template.title_tmpl, variables),
            body: template.body_tmpl ? interpolate(template.body_tmpl, variables) : undefined,
            link,
            type: template.type ?? "info",
        });
    } catch (err) {
        console.error("[notifications] Failed to send from template:", err);
    }
}

/**
 * Send a notification to all members of an org with a specific role.
 */
export async function sendToRole({
    orgId,
    role,
    title,
    body,
    link,
    type = "info",
    moduleSlug,
}: Omit<SendNotificationParams, "userId"> & { role: string }) {
    try {
        const supabase = await createServerClient();
        const { data: members } = await supabase
            .from("org_members")
            .select("user_id")
            .eq("org_id", orgId)
            .eq("role", role);

        if (!members?.length) return;

        const notifications = members.map((m) => ({
            user_id: m.user_id,
            org_id: orgId,
            title,
            body,
            link,
            type,
            module_slug: moduleSlug,
        }));

        await supabase.from("notifications").insert(notifications);
    } catch (err) {
        console.error("[notifications] Failed to send to role:", err);
    }
}
