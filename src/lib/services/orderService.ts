import { supabase } from "$lib/supabaseClient";
import type { Order } from "$lib/types";

export const orderService = {
    async quickReceive(id: string) {
        return await supabase
            .from("orders")
            .update({
                status: "received",
                received_date: new Date().toISOString().split("T")[0],
                is_received: true,
            })
            .eq("id", id);
    },

    async revertReceive(id: string) {
        return await supabase
            .from("orders")
            .update({
                status: "ordered",
                received_date: null,
                storage_location: null,
                is_received: false,
            })
            .eq("id", id);
    },

    async deleteAllOrders() {
        return await supabase
            .from("orders")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
    },

    async deleteOrder(id: string) {
        return await supabase.from("orders").delete().eq("id", id);
    },

    async upsertOrder(order: Partial<Order>) {
        // Logic for saving/updating from the dialog, if we want to move it here later.
        // For now keeping it simple as per current usage patterns (which use direct calls often)
        // But let's expose a clear method for the Dialog to use potentially.
        const dataToSave = {
            ...order,
            received_date: order.received_date ? order.received_date : null,
        };

        if (order.id) {
            return await supabase.from("orders").update(dataToSave).eq("id", order.id);
        } else {
            return await supabase.from("orders").insert([dataToSave]);
        }
    }
};
