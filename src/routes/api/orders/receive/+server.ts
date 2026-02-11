import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { ORDER_STATUS } from '$lib/constants';

function getTodayISO(): string {
    return new Date().toISOString().split("T")[0];
}

export async function POST({ request }) {
    const { ids, receivedDate, storageLocation } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
        return json({ error: "Invalid payload" }, { status: 400 });
    }

    const targetIds = Array.from(
        new Set(ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)),
    );

    if (targetIds.length === 0) {
        return json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data: orders, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('id, quantity')
        .in('id', targetIds);

    if (fetchError) {
        return json({ error: fetchError.message }, { status: 500 });
    }

    const effectiveReceivedDate =
        typeof receivedDate === "string" && receivedDate.length > 0
            ? receivedDate
            : getTodayISO();
    const effectiveStorageLocation =
        typeof storageLocation === "string" && storageLocation.trim().length > 0
            ? storageLocation.trim()
            : undefined;

    let lastError: { message: string } | null = null;

    for (const order of orders || []) {
        const updateFields: Record<string, unknown> = {
            status: ORDER_STATUS.RECEIVED,
            received_date: effectiveReceivedDate,
            is_received: true,
            quantity_received: order.quantity,
        };

        if (effectiveStorageLocation) {
            updateFields.storage_location = effectiveStorageLocation;
        }

        const { error } = await supabaseAdmin
            .from('orders')
            .update(updateFields)
            .eq('id', order.id);

        if (error) {
            lastError = error;
        }
    }

    if (lastError) {
        return json({ error: lastError.message }, { status: 500 });
    }

    return json({ success: true, updated: orders?.length || 0 });
}
