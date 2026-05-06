import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ApplicatorAuthContext = {
    supabase: any;
    user: { id: string; email?: string };
    applicator: {
        id: string;
        org_id: string;
        name: string;
        email: string | null;
        rate_per_hour: number | null;
        certified_levels: string[] | null;
    };
};

type ApplicatorHandler = (
    req: NextRequest,
    ctx: ApplicatorAuthContext,
    nextCtx: any,
    ...args: any[]
) => Promise<NextResponse>;

export function withApplicatorAuth(handler: ApplicatorHandler) {
    return async (req: NextRequest, nextCtx: any, ...args: any[]) => {
        try {
            const supabase = await createClient();
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const { data: applicator, error: applicatorError } = await supabase
                .from("applicators")
                .select("id, org_id, name, email, rate_per_hour, certified_levels")
                .eq("auth_user_id", user.id)
                .is("deleted_at", null)
                .single();

            if (applicatorError || !applicator) {
                return NextResponse.json({ error: "Not an applicator account" }, { status: 403 });
            }

            return handler(
                req,
                {
                    supabase,
                    user: { id: user.id, email: user.email ?? undefined },
                    applicator,
                },
                nextCtx,
                ...args
            );
        } catch (error: any) {
            return NextResponse.json(
                { error: error?.message ?? "Internal server error" },
                { status: 500 }
            );
        }
    };
}
