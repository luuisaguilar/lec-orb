import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

type DocumentRow = {
    uploaded_by: string | null;
    [key: string]: unknown;
};

type ProfileRow = {
    id: string;
    full_name: string | null;
};

export const GET = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const moduleSlug = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    let query = supabase
        .from("documents")
        .select("*")
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false });

    if (moduleSlug) query = query.eq("module_slug", moduleSlug);
    if (recordId) query = query.eq("record_id", recordId);

    const { data: documents, error } = await query;
    if (error) throw error;

    const documentsList = (documents ?? []) as DocumentRow[];

    const uploaderIds = Array.from(
        new Set(
            documentsList
                .map((doc) => doc.uploaded_by)
                .filter((id): id is string => Boolean(id))
        )
    );

    let profileById = new Map<string, string>();
    if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", uploaderIds);

        profileById = new Map(
            ((profiles ?? []) as ProfileRow[])
                .filter((profile) => Boolean(profile.id))
                .map((profile) => [profile.id, profile.full_name || "Sin asignar"])
        );
    }

    const enrichedDocuments = documentsList.map((doc) => ({
        ...doc,
        uploaded_by_name: doc.uploaded_by ? profileById.get(doc.uploaded_by) ?? "Sin asignar" : "Sin asignar",
    }));

    return NextResponse.json({ documents: enrichedDocuments });
}, { module: "documents", action: "view" });

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const moduleSlug = formData.get("module_slug") as string;
    const recordId = formData.get("record_id") as string | null;
    const tagsRaw = formData.get("tags") as string | null;

    if (!file || !moduleSlug) {
        return NextResponse.json({ error: "file and module_slug are required" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const storagePath = `${member.org_id}/${moduleSlug}/${recordId ?? "general"}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from("org-documents")
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) throw uploadError;

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
}, { module: "documents", action: "edit" });

export const DELETE = withAuth(async (req, { supabase, member }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { data: doc } = await supabase
        .from("documents")
        .select("file_path")
        .eq("id", id)
        .eq("org_id", member.org_id)
        .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    await supabase.storage.from("org-documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", id).eq("org_id", member.org_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
}, { module: "documents", action: "delete" });
