import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/v1/documents?module=events&record_id=abc123
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const moduleSlug = searchParams.get("module");
        const recordId = searchParams.get("record_id");

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        let query = supabase
            .from("documents")
            .select("*")
            .eq("org_id", member.org_id)
            .order("created_at", { ascending: false });

        if (moduleSlug) query = query.eq("module_slug", moduleSlug);
        if (recordId) query = query.eq("record_id", recordId);

        const { data: documents, error } = await query;
        if (error) throw error;

        return NextResponse.json({ documents: documents ?? [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}

// POST /api/v1/documents — upload a file + create metadata
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const moduleSlug = formData.get("module_slug") as string;
        const recordId = formData.get("record_id") as string | null;
        const tagsRaw = formData.get("tags") as string | null;

        if (!file || !moduleSlug) {
            return NextResponse.json({ error: "file and module_slug are required" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
        if (!member) return NextResponse.json({ error: "No organization" }, { status: 403 });

        // Upload to Supabase Storage
        const ext = file.name.split(".").pop() ?? "bin";
        const storagePath = `${member.org_id}/${moduleSlug}/${recordId ?? "general"}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from("org-documents")
            .upload(storagePath, file, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            // Auto-create bucket if it doesn't exist, then retry
            if (uploadError.message?.includes("not found")) {
                return NextResponse.json(
                    { error: "Storage bucket 'org-documents' not found. Please create it in Supabase dashboard." },
                    { status: 500 }
                );
            }
            throw uploadError;
        }

        // Insert metadata
        const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

        const { data: doc, error } = await supabase
            .from("documents")
            .insert({
                org_id: member.org_id,
                module_slug: moduleSlug,
                record_id: recordId || null,
                file_name: file.name,
                file_path: storagePath,
                file_size: file.size,
                mime_type: file.type,
                tags,
                uploaded_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ document: doc }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/v1/documents?id=xxx
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: member } = await supabase
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();
        if (!member || !["admin", "supervisor"].includes(member.role)) {
            return NextResponse.json({ error: "Only admins/supervisors can delete documents" }, { status: 403 });
        }

        // Get file path before deleting metadata
        const { data: doc } = await supabase
            .from("documents")
            .select("file_path")
            .eq("id", id)
            .eq("org_id", member.org_id)
            .single();

        if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

        // Delete from Storage
        await supabase.storage.from("org-documents").remove([doc.file_path]);

        // Delete metadata
        await supabase.from("documents").delete().eq("id", id).eq("org_id", member.org_id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
    }
}
