import { supabase } from "$lib/supabaseClient";
import { ORDER_STATUS } from "$lib/constants";
import type { Order } from "$lib/types";

/**
 * Helper to get today's date in ISO format (YYYY-MM-DD)
 */
function getTodayISO(): string {
    return new Date().toISOString().split("T")[0];
}

export const orderService = {
    /**
     * Mark a single order as received
     */
    async quickReceive(id: string) {
        return await supabase
            .from("orders")
            .update({
                status: ORDER_STATUS.RECEIVED,
                received_date: getTodayISO(),
                is_received: true,
            })
            .eq("id", id);
    },

    /**
     * Revert a received order back to requested status
     */
    async revertReceive(id: string) {
        return await supabase
            .from("orders")
            .update({
                status: ORDER_STATUS.REQUESTED,
                received_date: null,
                storage_location: null,
                is_received: false,
            })
            .eq("id", id);
    },

    /**
     * Mark multiple orders as received in a single DB call
     */
    async bulkReceive(ids: string[]) {
        if (ids.length === 0) return { data: null, error: null };

        return await supabase
            .from("orders")
            .update({
                status: ORDER_STATUS.RECEIVED,
                received_date: getTodayISO(),
                is_received: true,
            })
            .in("id", ids);
    },

    /**
     * Delete multiple orders in a single DB call
     */
    async bulkDelete(ids: string[]) {
        if (ids.length === 0) return { data: null, error: null };

        return await supabase
            .from("orders")
            .delete()
            .in("id", ids);
    },

    /**
     * Delete all orders (for database wipe functionality)
     */
    async deleteAllOrders() {
        return await supabase
            .from("orders")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
    },

    /**
     * Delete a single order
     */
    async deleteOrder(id: string) {
        return await supabase.from("orders").delete().eq("id", id);
    },

    /**
     * Create or update an order
     */
    async upsertOrder(order: Partial<Order>) {
        const dataToSave = {
            ...order,
            received_date: order.received_date ? order.received_date : null,
        };

        if (order.id) {
            return await supabase.from("orders").update(dataToSave).eq("id", order.id);
        } else {
            // Generate ID if missing to prevent "violates not-null constraint" if DB has no default
            const insertData = { ...dataToSave };
            if (!insertData.id && typeof crypto !== "undefined" && crypto.randomUUID) {
                insertData.id = crypto.randomUUID();
            }
            return await supabase.from("orders").insert([insertData]);
        }
    },

    /**
     * Update a single order with partial data
     */
    async updateOrder(id: string, updates: Partial<Order>) {
        return await supabase
            .from("orders")
            .update(updates)
            .eq("id", id);
    },

    /**
     * Insert multiple orders (for Excel import)
     */
    async insertOrders(orders: any[]) {
        return await supabase.from("orders").insert(orders);
    }
};
