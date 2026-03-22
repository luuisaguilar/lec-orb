// Demo mode configuration
// Demo mode is restricted to explicit local development only.
// It never auto-activates from placeholder config or production-like runtimes.

export const DEMO_MODE =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
    process.env.NODE_ENV === "development";

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
