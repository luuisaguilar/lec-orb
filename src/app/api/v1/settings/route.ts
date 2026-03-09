import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo/config";

// In-memory settings for demo mode
let demoSettings = { locale: "es-MX", theme: "system" };

export async function GET() {
    // DEMO MODE — return in-memory settings
    if (DEMO_MODE) {
        return NextResponse.json(demoSettings, { status: 200 });
    }

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { locale: "es-MX", theme: "system" },
                { status: 200 }
            );
        }

        const { data, error } = await supabase
            .from("user_settings")
            .select("locale, theme")
            .eq("user_id", user.id)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { locale: "es-MX", theme: "system" },
                { status: 200 }
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch {
        return NextResponse.json(
            { locale: "es-MX", theme: "system" },
            { status: 200 }
        );
    }
}

export async function PUT(request: Request) {
    const body = await request.json();
    const locale = body.locale || "es-MX";
    const theme = body.theme || "system";

    if (!["es-MX", "en-US"].includes(locale)) {
        return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    if (!["light", "dark", "system"].includes(theme)) {
        return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }

    // DEMO MODE — store in memory
    if (DEMO_MODE) {
        demoSettings = { locale, theme };
        return NextResponse.json(demoSettings, { status: 200 });
    }

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        if (error) {
            return NextResponse.json(
                { error: "Failed to save settings" },
                { status: 500 }
            );
        }

        return NextResponse.json({ locale, theme }, { status: 200 });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
