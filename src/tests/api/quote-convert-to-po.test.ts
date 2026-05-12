import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as convertToPo } from "@/app/api/v1/quotes/[id]/convert-to-po/route";

vi.mock("@/lib/auth/with-handler", () => ({
    withAuth: (handler: any) => handler,
}));

vi.mock("@/lib/audit/log", () => ({
    logAudit: vi.fn(),
}));

function createQuoteChain(result: { data: any; error: any }) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
    };
}

describe("POST /api/v1/quotes/[id]/convert-to-po", () => {
    const member = { org_id: "org-1", id: "m1", role: "admin" };
    const user = { id: "u1" };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("copies subtotal, taxes and line items from approved quote to purchase order", async () => {
        const quoteRow = {
            id: "quote-1",
            org_id: "org-1",
            status: "APPROVED",
            provider: "Proveedor X",
            description: "Pedido libros",
            file_path: null,
            subtotal: 100,
            taxes: 16,
            currency: "MXN",
            supplier_id: null,
            notes: null,
            quote_items: [
                {
                    id: "qi-1",
                    description: "Libro A",
                    quantity: 2,
                    unit_price: 50,
                    tax_rate: 0.16,
                    sort_order: 0,
                },
            ],
        };

        const newPo = {
            id: "po-1",
            org_id: "org-1",
            folio: "OC-2026-00001",
            quote_id: "quote-1",
            subtotal: 100,
            taxes: 16,
            currency: "MXN",
        };

        const poWithItems = {
            ...newPo,
            purchase_order_items: [
                {
                    id: "poi-1",
                    purchase_order_id: "po-1",
                    quote_item_id: "qi-1",
                    description: "Libro A",
                    quantity: 2,
                    unit_price: 50,
                    tax_rate: 0.16,
                    sort_order: 0,
                },
            ],
        };

        const quoteChain = createQuoteChain({ data: quoteRow, error: null });

        const insertPoChain = {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: newPo, error: null }),
        };

        const finalSelect = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: poWithItems, error: null }),
        };

        const itemsInsert = vi.fn().mockResolvedValue({ error: null });

        let purchaseOrdersFromCount = 0;
        const from = vi.fn((table: string) => {
            if (table === "quotes") return quoteChain;
            if (table === "purchase_orders") {
                purchaseOrdersFromCount += 1;
                if (purchaseOrdersFromCount === 1) return insertPoChain;
                return finalSelect;
            }
            if (table === "purchase_order_items") {
                return { insert: itemsInsert };
            }
            return quoteChain;
        });

        const supabase = { from, rpc: vi.fn().mockResolvedValue({ data: "OC-2026-00001", error: null }) };

        const req = new NextRequest("http://localhost/api/v1/quotes/quote-1/convert-to-po", { method: "POST" });
        const res = await (convertToPo as any)(req, { supabase, user, member }, { params: Promise.resolve({ id: "quote-1" }) });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.order.subtotal).toBe(100);
        expect(body.order.taxes).toBe(16);
        expect(body.order.purchase_order_items).toHaveLength(1);
        expect(body.order.purchase_order_items[0].quote_item_id).toBe("qi-1");
        expect(body.order.purchase_order_items[0].quantity).toBe(2);
        expect(body.order.purchase_order_items[0].unit_price).toBe(50);
        expect(insertPoChain.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                subtotal: 100,
                taxes: 16,
                quote_id: "quote-1",
            })
        );
        expect(itemsInsert).toHaveBeenCalled();
    });

    it("returns 400 when quote is not approved", async () => {
        const quoteChain = createQuoteChain({
            data: {
                id: "q2",
                org_id: "org-1",
                status: "PENDING",
                quote_items: [],
            },
            error: null,
        });
        const supabase = { from: vi.fn(() => quoteChain), rpc: vi.fn() };

        const req = new NextRequest("http://localhost/api/v1/quotes/q2/convert-to-po", { method: "POST" });
        const res = await (convertToPo as any)(req, { supabase, user, member }, { params: Promise.resolve({ id: "q2" }) });

        expect(res.status).toBe(400);
    });
});
