import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    if (!path) return NextResponse.json({ error: "Path is required" }, { status: 400 });

    const orgIdFromPath = path.split("/")[0];
    if (member.org_id !== orgIdFromPath) return NextResponse.json({ error: "Access denied to this document" }, { status: 403 });

    const { data, error } = await supabase.storage.from("org-documents").createSignedUrl(path, 60);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error("Could not generate download link");

    return NextResponse.redirect(data.signedUrl);
}, { module: "documents", action: "view" });
