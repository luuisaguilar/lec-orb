import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/v1/audit-logs/route";
import { AuthContext } from "@/lib/auth/with-handler";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: unknown) => handler,
}));

const makeChain = (data: unknown, count: number = 0, error: unknown = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: any) => void) => resolve({ data, count, error })),
});

type Handler = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>;

describe("Audit Logs API Route", () => {
    let mockMember: AuthContext["member"];
    let mockUser: AuthContext["user"];

    beforeEach(() => {
        vi.clearAllMocks();
        mockMember = { 
            id: "m1", 
            org_id: "org-uuid-001", 
            role: "admin",
            location: null,
            organizations: { name: "Test Org", slug: "test-org" }
        };
        mockUser = { id: "u1" };
    });

    describe("GET /api/v1/audit-logs", () => {
        it("should return logs with pagination", async () => {
            const logsData = [
                { id: "l1", table_name: "events", operation: "INSERT", changed_by: "u1", changed_at: "2024-01-01" },
            ];
            const profilesData = [{ id: "u1", full_name: "Luis Aguilar" }];

            const logsChain = makeChain(logsData, 1);
            const profilesChain = makeChain(profilesData);

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "audit_log") return logsChain;
                    if (table === "profiles") return profilesChain;
                    return logsChain;
                }),
            } as unknown as AuthContext["supabase"];

            const req = new NextRequest("http://localhost/api/v1/audit-logs?limit=10&offset=0");
            const response = await (GET as unknown as Handler)(req, { 
                supabase: mockSupabase, 
                user: mockUser, 
                member: mockMember,
                enrichAudit: vi.fn()
            });
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.logs).toHaveLength(1);
            expect(body.pagination.total).toBe(1);
            expect(body.pagination.limit).toBe(10);
            expect(body.pagination.offset).toBe(0);
        });

        it("should enrich logs with profile name", async () => {
            const logsData = [{ id: "l1", table_name: "payments", operation: "INSERT", changed_by: "u1", changed_at: "2024-01-01" }];
            const profilesData = [{ id: "u1", full_name: "Ana Torres" }];

            const mockSupabase = {
                from: vi.fn((table: string) =>
                    table === "audit_log" ? makeChain(logsData, 1) : makeChain(profilesData)
                ),
            } as unknown as AuthContext["supabase"];

            const req = new NextRequest("http://localhost/api/v1/audit-logs");
            const response = await (GET as unknown as Handler)(req, { 
                supabase: mockSupabase, 
                user: mockUser, 
                member: mockMember,
                enrichAudit: vi.fn()
            });
            const body = await response.json();

            expect(body.logs[0].profiles.full_name).toBe("Ana Torres");
        });

        it("should filter by table when param provided", async () => {
            const chain = makeChain([], 0);
            const mockSupabase = { from: vi.fn(() => chain) } as unknown as AuthContext["supabase"];

            const req = new NextRequest("http://localhost/api/v1/audit-logs?table=payments");
            await (GET as unknown as Handler)(req, { 
                supabase: mockSupabase, 
                user: mockUser, 
                member: mockMember,
                enrichAudit: vi.fn()
            });

            expect(chain.eq).toHaveBeenCalledWith("table_name", "payments");
        });

        it("should filter by action uppercased when param provided", async () => {
            const chain = makeChain([], 0);
            const mockSupabase = { from: vi.fn(() => chain) } as unknown as AuthContext["supabase"];

            const req = new NextRequest("http://localhost/api/v1/audit-logs?action=insert");
            await (GET as unknown as Handler)(req, { 
                supabase: mockSupabase, 
                user: mockUser, 
                member: mockMember,
                enrichAudit: vi.fn()
            });

            expect(chain.eq).toHaveBeenCalledWith("operation", "INSERT");
        });

        it("should return empty logs with null profiles when no changed_by", async () => {
            const logsData = [{ id: "l1", table_name: "events", operation: "DELETE", changed_by: null }];
            const mockSupabase = { from: vi.fn(() => makeChain(logsData, 1)) } as unknown as AuthContext["supabase"];

            const req = new NextRequest("http://localhost/api/v1/audit-logs");
            const response = await (GET as unknown as Handler)(req, { 
                supabase: mockSupabase, 
                user: mockUser, 
                member: mockMember,
                enrichAudit: vi.fn()
            });
            const body = await response.json();

            expect(body.logs[0].profiles).toBeNull();
        });
    });
});
