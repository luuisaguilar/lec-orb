import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo/config";
import { withAuth } from "@/lib/auth/with-handler";

let demoSettings = { locale: "es-MX", theme: "system" };

export const GET = withAuth(async (req, { supabase, user }) => {
    if (DEMO_MODE) return NextResponse.json(demoSettings, { status: 200 });

    const { data, error } = await supabase
        .from("user_settings")
        .select("locale, theme")
        .eq("user_id", user.id)
        .single();

    if (error || !data) return NextResponse.json({ locale: "es-MX", theme: "system" }, { status: 200 });
    return NextResponse.json(data, { status: 200 });
}, { module: "users", action: "view" }); // Settings usually part of user module or profile

export const PUT = withAuth(async (req, { supabase, user }) => {
    const body = await req.json();
    const locale = body.locale || "es-MX";
    const theme = body.theme || "system";

    if (!["es-MX", "en-US"].includes(locale)) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    if (!["light", "dark", "system"].includes(theme)) return NextResponse.json({ error: "Invalid theme" }, { status: 400 });

    if (DEMO_MODE) {
        demoSettings = { locale, theme };
        return NextResponse.json(demoSettings, { status: 200 });
    }

    const { error } = await supabase.from("user_settings").upsert(
        {
            user_id: user.id,
            locale,
            theme,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
    );

    if (error) throw error;
    return NextResponse.json({ locale, theme }, { status: 200 });
}, { module: "users", action: "view" });
