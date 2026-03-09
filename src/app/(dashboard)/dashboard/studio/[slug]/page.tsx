import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import StudioEditorClient from "./StudioEditorClient";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function StudioEditorPage({ params }: PageProps) {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: member } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .single();

    if (!member || member.role !== "admin") redirect("/dashboard");

    // Fetch module
    const { data: module } = await supabase
        .from("module_registry")
        .select("*")
        .eq("slug", slug)
        .or(`org_id.is.null,org_id.eq.${member.org_id}`)
        .single();

    if (!module) notFound();
    if (module.is_native) redirect("/dashboard/studio");

    // Fetch fields
    const { data: fields } = await supabase
        .from("module_fields")
        .select("*")
        .eq("module_id", module.id)
        .order("sort_order", { ascending: true });

    return <StudioEditorClient module={module} initialFields={fields ?? []} />;
}

export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: module } = await supabase
        .from("module_registry")
        .select("name")
        .eq("slug", slug)
        .single();
    return { title: `Studio — ${module?.name ?? slug}` };
}
