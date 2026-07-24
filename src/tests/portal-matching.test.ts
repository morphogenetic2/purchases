import { describe, expect, it } from "vitest";
import type { Order } from "$lib/types";
import {
    reconcilePortalOrders,
    type PortalOrder,
} from "$lib/utils/portalMatching";

function order(overrides: Partial<Order> = {}): Order {
    return {
        id: "order-1",
        created_at: "2026-07-01T00:00:00Z",
        description: "PBS buffer 500 ml",
        provider: "Sigma",
        ordered_by: "ARN",
        quantity: 2,
        status: "requested",
        sku: "P4417",
        ...overrides,
    };
}

function portalOrder(overrides: Partial<PortalOrder> = {}): PortalOrder {
    return {
        project_code: null,
        order_date: "2026-07-20",
        po_number: "PO-100",
        provider: "Sigma",
        sku: "P4417",
        description: "PBS buffer 500 ml",
        quantity: 2,
        price: null,
        ordered_by: "ARN",
        ...overrides,
    };
}

describe("reconcilePortalOrders", () => {
    it("skips a PO that is already represented, regardless of provider", () => {
        const result = reconcilePortalOrders(
            [portalOrder()],
            [order({ po_number: "po-100", provider: "Different provider" })],
        );

        expect(result).toEqual([]);
    });

    it("offers one strong missing-PO match as a PO update", () => {
        const existing = order({ po_number: undefined });
        const result = reconcilePortalOrders([portalOrder()], [existing]);

        expect(result).toHaveLength(1);
        expect(result[0].action).toBe("link_po");
        expect(result[0].existingOrder?.id).toBe(existing.id);
    });

    it("does not update when more than one existing order is a strong match", () => {
        const result = reconcilePortalOrders(
            [portalOrder()],
            [order({ id: "order-1" }), order({ id: "order-2" })],
        );

        expect(result[0].action).toBe("ambiguous");
    });

    it("keeps unmatched portal rows as new imports", () => {
        const result = reconcilePortalOrders(
            [portalOrder({ sku: "DIFFERENT-SKU" })],
            [order({ po_number: undefined })],
        );

        expect(result[0].action).toBe("import");
    });

    it("does not propose or duplicate PO-exempt project-code orders", () => {
        const existing = order({
            project_code: "L32ZZZZZZSO",
            po_number: undefined,
        });
        const result = reconcilePortalOrders(
            [portalOrder({ project_code: "L32ZZZZZZSO" })],
            [existing],
        );

        expect(result).toEqual([]);
    });
});
