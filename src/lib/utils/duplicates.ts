import { ORDER_STATUS } from "$lib/constants";
import type {
    DuplicateOrderGroup,
    DuplicateOrderSignature,
    Order,
} from "$lib/types";

function normalizeString(value?: string | null): string {
    return (value ?? "").trim().toLowerCase();
}

function normalizeNumber(value?: number | null): string {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "";
    }

    return value.toString();
}

function normalizeDate(value?: string | null): string {
    return (value ?? "").trim();
}

function getComparableSignature(order: Order): DuplicateOrderSignature {
    return {
        order_date: normalizeDate(order.order_date),
        description: normalizeString(order.description),
        sku: normalizeString(order.sku),
        provider: normalizeString(order.provider),
        ordered_by: normalizeString(order.ordered_by),
        project_code: normalizeString(order.project_code),
        po_number: normalizeString(order.po_number),
        unit_price: normalizeNumber(order.unit_price),
        status: normalizeString(order.status),
        received_date: normalizeDate(order.received_date),
        storage_location: normalizeString(order.storage_location),
    };
}

export function getDuplicateGroupKey(order: Order): string {
    return JSON.stringify(getComparableSignature(order));
}

export function findDuplicateGroups(orders: Order[]): DuplicateOrderGroup[] {
    const groups = new Map<string, Order[]>();

    for (const order of orders) {
        const key = getDuplicateGroupKey(order);
        const existing = groups.get(key);

        if (existing) {
            existing.push(order);
        } else {
            groups.set(key, [order]);
        }
    }

    return Array.from(groups.entries())
        .filter(([, groupOrders]) => groupOrders.length > 1)
        .map(([key, groupOrders]) => {
            const sortedOrders = [...groupOrders].sort(compareOrdersForResolution);

            return {
                key,
                signature: getComparableSignature(sortedOrders[0]),
                orders: sortedOrders,
                totalQuantity: sortedOrders.reduce(
                    (sum, order) => sum + (order.quantity || 0),
                    0,
                ),
                totalQuantityReceived: sortedOrders.reduce(
                    (sum, order) => sum + (order.quantity_received || 0),
                    0,
                ),
            };
        })
        .sort((a, b) => compareOrdersForResolution(a.orders[0], b.orders[0]));
}

export function compareOrdersForResolution(a: Order, b: Order): number {
    const dateA = a.created_at || a.order_date || "";
    const dateB = b.created_at || b.order_date || "";
    const byDate = dateA.localeCompare(dateB);

    if (byDate !== 0) {
        return byDate;
    }

    return a.id.localeCompare(b.id);
}

export function getPreferredReceivedDate(orders: Order[]): string | null {
    const candidates = orders
        .map((order) => normalizeDate(order.received_date))
        .filter(Boolean)
        .sort();

    return candidates.at(-1) || null;
}

export function getPreferredStorageLocation(orders: Order[]): string | null {
    for (const order of orders) {
        const location = order.storage_location?.trim();
        if (location) {
            return location;
        }
    }

    return null;
}

export function deriveMergedOrderState(orders: Order[]) {
    const totalQuantity = orders.reduce(
        (sum, order) => sum + (order.quantity || 0),
        0,
    );
    const totalQuantityReceived = orders.reduce(
        (sum, order) => sum + (order.quantity_received || 0),
        0,
    );
    const receivedDate = getPreferredReceivedDate(orders);
    const storageLocation = getPreferredStorageLocation(orders);

    let status = orders[0]?.status || ORDER_STATUS.REQUESTED;
    let isReceived = false;

    if (totalQuantityReceived >= totalQuantity && totalQuantity > 0) {
        status = ORDER_STATUS.RECEIVED;
        isReceived = true;
    } else if (totalQuantityReceived > 0) {
        status = ORDER_STATUS.PARTIALLY_RECEIVED;
    }

    return {
        quantity: totalQuantity,
        quantity_received: totalQuantityReceived || 0,
        received_date: receivedDate,
        storage_location: storageLocation,
        status,
        is_received: isReceived,
    };
}
