import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import DynamicModule from "@/components/dynamic/DynamicModule";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * /dashboard/m/[slug]
 * -------------------
 * Dynamic catch-all route for custom modules created via LEC Studio.
 * Native modules are NOT served here — they still use their own dedicated pages.
 *
 * Flow:
 * 1. Verify user is authenticated and has an org
 * 2. Look up the module in module_registry
 * 3. If is_native → redirect to the real route (safety net)
 * 4. If custom → render <DynamicModule>
 * 5. If not found / not active → 404
 */
export default async function DynamicModulePage({ params }: PageProps) {
    const { slug } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Org membership
    const { data: member } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .single();

    if (!member) redirect("/login");

    // Find module in registry
    const { data: module } = await supabase
        .from("module_registry")
        .select("*")
        .eq("slug", slug)
        .or(`org_id.is.null,org_id.eq.${member.org_id}`)
        .eq("is_active", true)
        .single();

    if (!module) notFound();

    // Safety redirect for native modules
    // (shouldn't normally happen but guards against manual URL entry)
    const NATIVE_ROUTES: Record<string, string> = {
        "dashboard": "/dashboard",
        "schools": "/dashboard/schools",
        "applicators": "/dashboard/applicators",
        "events": "/dashboard/eventos",
        "inventory": "/dashboard/inventario",
        "toefl": "/dashboard/toefl/administraciones",
        "cenni": "/dashboard/cenni",
        "exam-codes": "/dashboard/codigos",
        "calculator": "/dashboard/calculadora-tiempos",
        "catalog": "/dashboard/catalogo",
        "quotes": "/dashboard/cotizaciones",
        "purchase-orders": "/dashboard/ordenes",
        "payments": "/dashboard/pagos",
        "payroll": "/dashboard/nomina",
        "users": "/dashboard/users",
        "audit-log": "/dashboard/actividad",
    };

    if (module.is_native && NATIVE_ROUTES[slug]) {
        redirect(NATIVE_ROUTES[slug]);
    }

    // Get module fields for the generic renderer
    const { data: fields } = await supabase
        .from("module_fields")
        .select("*")
        .eq("module_id", module.id)
        .order("sort_order", { ascending: true });

    return (
        <DynamicModule
            module={module}
            fields={fields ?? []}
            orgId={member.org_id}
            userRole={member.role}
        />
    );
}

// Dynamic metadata
export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: module } = await supabase
        .from("module_registry")
        .select("name, description")
        .eq("slug", slug)
        .single();

    return {
        title: module?.name ?? "Módulo",
        description: module?.description ?? "",
    };
}
