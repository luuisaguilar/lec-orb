// Demo mode configuration
// Demo mode is explicit and local-development only.

export const DEMO_MODE =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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
