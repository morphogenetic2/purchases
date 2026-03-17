import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORDER_STATUS } from "$lib/constants";
import { getDuplicateGroupKey } from "$lib/utils/duplicates";
import type { Order } from "$lib/types";

const supabaseState = vi.hoisted(() => ({
    fromMock: vi.fn(),
    selectedOrders: [] as Order[],
    selectError: null as { message: string } | null,
    updatePayload: null as Record<string, unknown> | null,
    updateId: null as string | null,
    updateResult: null as Order | null,
    updateError: null as { message: string } | null,
    deleteTargets: [] as string[][],
    deleteError: null as { message: string } | null,
}));

vi.mock("$lib/server/supabaseAdmin", () => ({
    supabaseAdmin: {
        from: supabaseState.fromMock,
    },
}));

import { POST } from "../../routes/api/orders/duplicates/+server";

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

function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/orders/duplicates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("POST /api/orders/duplicates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        supabaseState.selectedOrders = [];
        supabaseState.selectError = null;
        supabaseState.updatePayload = null;
        supabaseState.updateId = null;
        supabaseState.updateResult = null;
        supabaseState.updateError = null;
        supabaseState.deleteTargets = [];
        supabaseState.deleteError = null;

        supabaseState.fromMock.mockImplementation(() => ({
            select: () => ({
                in: async (_column: string, ids: string[]) => ({
                    data: supabaseState.selectedOrders.filter((order) =>
                        ids.includes(order.id)
                    ),
                    error: supabaseState.selectError,
                }),
            }),
            update: (payload: Record<string, unknown>) => {
                supabaseState.updatePayload = payload;
                return {
                    eq: (_column: string, id: string) => {
                        supabaseState.updateId = id;
                        return {
                            select: () => ({
                                single: async () => ({
                                    data: supabaseState.updateResult,
                                    error: supabaseState.updateError,
                                }),
                            }),
                        };
                    },
                };
            },
            delete: () => ({
                in: async (_column: string, ids: string[]) => {
                    supabaseState.deleteTargets.push(ids);
                    return { error: supabaseState.deleteError };
                },
            }),
        }));
    });

    it("merges duplicate groups by updating the oldest order and deleting extras", async () => {
        const oldest = makeOrder({ id: "a", quantity: 1 });
        const newest = makeOrder({
            id: "b",
            created_at: "2026-03-02T10:00:00.000Z",
            quantity: 2,
        });
        const groupKey = getDuplicateGroupKey(oldest);

        supabaseState.selectedOrders = [oldest, newest];
        supabaseState.updateResult = {
            ...oldest,
            quantity: 3,
            quantity_received: 0,
            is_received: false,
        };

        const response = await POST({
            request: makeRequest({
                action: "merge",
                groupKey,
                ids: ["a", "b"],
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(supabaseState.updateId).toBe("a");
        expect(supabaseState.updatePayload).toMatchObject({
            quantity: 3,
            quantity_received: 0,
            status: ORDER_STATUS.REQUESTED,
            is_received: false,
        });
        expect(supabaseState.deleteTargets).toEqual([["b"]]);
        expect(body.data).toMatchObject({
            action: "merge",
            keptOrderId: "a",
            removedOrderIds: ["b"],
        });
    });

    it("deletes duplicate extras without updating the keeper", async () => {
        const oldest = makeOrder({ id: "a", quantity: 1 });
        const newest = makeOrder({
            id: "b",
            created_at: "2026-03-02T10:00:00.000Z",
            quantity: 2,
        });
        const groupKey = getDuplicateGroupKey(oldest);

        supabaseState.selectedOrders = [oldest, newest];

        const response = await POST({
            request: makeRequest({
                action: "delete",
                groupKey,
                ids: ["a", "b"],
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(supabaseState.updatePayload).toBeNull();
        expect(supabaseState.deleteTargets).toEqual([["b"]]);
        expect(body.data).toMatchObject({
            action: "delete",
            keptOrderId: "a",
            removedOrderIds: ["b"],
        });
    });
});
