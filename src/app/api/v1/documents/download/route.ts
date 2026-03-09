import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/v1/documents/download?path=...
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const path = searchParams.get("path");
        if (!path) return NextResponse.json({ error: "Path is required" }, { status: 400 });

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Security check: Verify the user has access to this document metadata
        // Since path contains org_id (member.org_id/module/record/file), we check if user belongs to that org
        const orgIdFromPath = path.split("/")[0];
        const { data: member } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .eq("org_id", orgIdFromPath)
            .single();

        if (!member) {
            return NextResponse.json({ error: "Access denied to this document" }, { status: 403 });
        }

        // Create a signed URL valid for 60 seconds
        const { data, error } = await supabase.storage
            .from("org-documents")
            .createSignedUrl(path, 60);

        if (error) throw error;
        if (!data?.signedUrl) throw new Error("Could not generate download link");

        // Redirect to the signed URL
        return NextResponse.redirect(data.signedUrl);
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}
