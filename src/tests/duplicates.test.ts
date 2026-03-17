import { describe, expect, it } from "vitest";
import { ORDER_STATUS } from "$lib/constants";
import {
    deriveMergedOrderState,
    findDuplicateGroups,
} from "$lib/utils/duplicates";
import type { Order } from "$lib/types";

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: "order-1",
        created_at: "2026-03-01T10:00:00.000Z",
        order_date: "2026-03-01",
        description: "Acetone",
        sku: "SKU-1",
        provider: "Sigma",
        ordered_by: "ARN",
        project_code: "P-001",
        po_number: "PO-1",
        quantity: 1,
        unit_price: 10,
        status: ORDER_STATUS.REQUESTED,
        ...overrides,
    };
}

describe("duplicate utilities", () => {
    it("groups exact duplicates even when quantity differs", () => {
        const groups = findDuplicateGroups([
            makeOrder({ id: "a", quantity: 1 }),
            makeOrder({ id: "b", quantity: 2 }),
            makeOrder({ id: "c", status: ORDER_STATUS.ORDERED }),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].orders.map((order) => order.id)).toEqual(["a", "b"]);
        expect(groups[0].totalQuantity).toBe(3);
    });

    it("does not group orders when non-quantity fields differ", () => {
        const groups = findDuplicateGroups([
            makeOrder({ id: "a", status: ORDER_STATUS.REQUESTED }),
            makeOrder({ id: "b", status: ORDER_STATUS.ORDERED }),
        ]);

        expect(groups).toHaveLength(0);
    });

    it("derives merged receive state from all duplicate rows", () => {
        const merged = deriveMergedOrderState([
            makeOrder({
                id: "a",
                quantity: 2,
                quantity_received: 2,
                status: ORDER_STATUS.RECEIVED,
                received_date: "2026-03-05",
                storage_location: "Shelf A",
            }),
            makeOrder({
                id: "b",
                quantity: 3,
                quantity_received: 1,
                status: ORDER_STATUS.PARTIALLY_RECEIVED,
                received_date: "2026-03-06",
            }),
        ]);

        expect(merged.quantity).toBe(5);
        expect(merged.quantity_received).toBe(3);
        expect(merged.status).toBe(ORDER_STATUS.PARTIALLY_RECEIVED);
        expect(merged.received_date).toBe("2026-03-06");
        expect(merged.storage_location).toBe("Shelf A");
        expect(merged.is_received).toBe(false);
    });
});
