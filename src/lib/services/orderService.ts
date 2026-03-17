import { ORDER_STATUS } from "$lib/constants";
import type { Order, ResolveDuplicateGroupPayload } from "$lib/types";

interface ReceiveOptions {
    receivedDate?: string;
    storageLocation?: string;
}

export const orderService = {
    /**
     * Mark a single order as received
     */
    async quickReceive(id: string, options?: ReceiveOptions) {
        const payload = {
            ids: [id],
            ...(options?.receivedDate ? { receivedDate: options.receivedDate } : {}),
            ...(options?.storageLocation ? { storageLocation: options.storageLocation } : {}),
        };

        const response = await fetch('/api/orders/receive', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Revert a received order back to requested status
     */
    async revertReceive(id: string) {
        const updates = {
            id,
            status: ORDER_STATUS.REQUESTED,
            received_date: null,
            storage_location: null,
            quantity_received: 0,
            is_received: false,
        };
        const response = await fetch('/api/orders', {
            method: 'PATCH',
            body: JSON.stringify(updates),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Mark multiple orders as received in a single DB call
     */
    async bulkReceive(ids: string[], options?: ReceiveOptions) {
        if (ids.length === 0) return { data: null, error: null };

        const payload = {
            ids,
            ...(options?.receivedDate ? { receivedDate: options.receivedDate } : {}),
            ...(options?.storageLocation ? { storageLocation: options.storageLocation } : {}),
        };

        const response = await fetch('/api/orders/receive', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Delete multiple orders in a single DB call
     */
    async bulkDelete(ids: string[]) {
        if (ids.length === 0) return { data: null, error: null };

        const response = await fetch('/api/orders', {
            method: 'DELETE',
            body: JSON.stringify({ ids }),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Delete a single order
     */
    async deleteOrder(id: string) {
        const response = await fetch('/api/orders', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Create or update an order
     */
    async upsertOrder(order: Partial<Order>) {
        const response = await fetch('/api/orders', {
            method: 'POST',
            body: JSON.stringify(order),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Update a single order with partial data
     */
    async updateOrder(id: string, updates: Partial<Order>) {
        const response = await fetch('/api/orders', {
            method: 'PATCH',
            body: JSON.stringify({ id, ...updates }),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Update multiple orders with the same partial data - NOT IMPLEMENTED ON API YET, FALLBACK OR LOOP
     * Logic: Iterate or create generic bulk update. 
     * Since general bulk update endpoint wasn't strictly planned, and usage is rare/unknown, 
     * we can map it to individual updates or just ignore if unused.
     * Checking usage led to: not widely used?
     * Actually, let's implement it by iterating upserts or single bulk update if possible.
     * 'upsert' works for bulk if we construct the array.
     */
    async bulkUpdate(ids: string[], updates: Partial<Order>) {
        if (ids.length === 0) return { data: null, error: null };

        const ordersToUpdate = ids.map(id => ({ id, ...updates }));

        const response = await fetch('/api/orders', {
            method: 'PATCH',
            body: JSON.stringify(ordersToUpdate),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Insert multiple orders (for Excel import)
     */
    async insertOrders(orders: any[]) {
        const response = await fetch('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orders),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    },

    /**
     * Resolve one duplicate group by merging quantities or deleting extra rows
     */
    async resolveDuplicateGroup(payload: ResolveDuplicateGroupPayload) {
        const response = await fetch('/api/orders/duplicates', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        return handleResponse(response);
    }
};

async function handleResponse(response: Response) {
    try {
        const result = await response.json();
        if (!response.ok || result.error) {
            return { data: null, error: { message: result.error || 'Request failed' } };
        }
        return { data: result.data || result.success, error: null };
    } catch (e) {
        return { data: null, error: { message: 'Network error or invalid JSON' } };
    }
}
