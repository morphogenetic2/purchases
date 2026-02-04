import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { ORDER_STATUS } from '$lib/constants';

function getTodayISO(): string {
    return new Date().toISOString().split("T")[0];
}

export async function POST({ request }) {
    const { ids } = await request.json(); // Bulk receive expects { ids: string[] }

    if (!ids || !Array.isArray(ids)) {
        return json({ error: "Invalid payload" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('orders')
        .update({
            status: ORDER_STATUS.RECEIVED,
            received_date: getTodayISO(),
            is_received: true,
        })
        .in('id', ids);

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
}
