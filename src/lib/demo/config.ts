// Demo mode configuration
// When NEXT_PUBLIC_DEMO_MODE=true, the app bypasses Supabase auth
// and uses mock data for all operations.

export const DEMO_MODE =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

export const DEMO_USER = {
    id: "demo-user-001",
    email: "demo@lec-platform.com",
    full_name: "Demo Admin",
};

export const DEMO_ORG = {
    id: "demo-org-001",
    name: "LEC Demo",
    slug: "lec-demo",
};

export const DEMO_MEMBER = {
    id: "demo-member-001",
    org_id: DEMO_ORG.id,
    user_id: DEMO_USER.id,
    role: "admin" as const,
};
