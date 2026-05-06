import { NextResponse } from "next/server";
import { withApplicatorAuth } from "@/lib/auth/with-applicator";

export const GET = withApplicatorAuth(async (_req, { applicator }) => {
    return NextResponse.json({
        applicator: {
            id: applicator.id,
            org_id: applicator.org_id,
            name: applicator.name,
            email: applicator.email,
            rate_per_hour: applicator.rate_per_hour,
            certified_levels: applicator.certified_levels ?? [],
        },
    });
});
