import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudioClient from "./StudioClient";

export const metadata = {
    title: "LEC Studio — Módulos",
    description: "Crea y gestiona módulos personalizados sin código",
};

export default async function StudioPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: member } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .single();

    if (!member || member.role !== "admin") {
        redirect("/dashboard");
    }

    return <StudioClient />;
}
