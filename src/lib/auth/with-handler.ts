import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedMember } from "./get-member";
import { checkServerPermission } from "./permissions";

export type AuthContext = {
    supabase: any;
    user: { id: string; email?: string };
    member: {
        id: string;
        org_id: string;
        role: string;
        location: string | null;
    };
};

type Handler = (
    req: NextRequest,
    ctx: AuthContext,
    nextCtx: any
) => Promise<NextResponse>;

type WithAuthOptions = {
    module?: string;
    action?: "view" | "edit" | "delete";
};

/**
 * withAuth
 * --------
 * Higher Order Function to wrap Next.js API route handlers.
 * Handles:
 * 1. Supabase client initialization.
 * 2. Auth session verification (401).
 * 3. Organization membership verification (403).
 * 4. Optional: Granular module permission check (403).
 */
export function withAuth(handler: Handler, options?: WithAuthOptions) {
    return async (req: NextRequest, nextCtx: any) => {
        try {
            const supabase = await createClient();
            
            // 1. Authenticate & Fetch Member
            const auth = await getAuthenticatedMember(supabase);
            if (!auth.ok) return auth.response;

            const { user, member } = auth;

            // 2. Optional: Permission Check
            if (options?.module && options?.action) {
                const hasPerm = await checkServerPermission(
                    supabase,
                    user.id,
                    options.module,
                    options.action
                );
                if (!hasPerm) {
                    return NextResponse.json(
                        { error: "Insufficient permissions" },
                        { status: 403 }
                    );
                }
            }

            // 3. Execute Handler
            return await handler(req, { supabase, user, member }, nextCtx);
        } catch (error: any) {
            console.error("API Error:", error);
            return NextResponse.json(
                { error: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    };
}
