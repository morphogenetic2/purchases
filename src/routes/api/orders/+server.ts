import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json({ orders: data });
}

export async function POST({ request }) {
    const order = await request.json();

    // Ensure we don't save undefined/null explicitly where not wanted, though Supabase handles it.
    // The client sends the full object usually.

    // ID Handling: Supabase will generate ID if we don't provide it on INSERT.
    // However, the client logic often assumes an ID exists for optimistic UI updates.
    // If the client provided an ID, use it. If not, let Supabase generate (or generate here).

    const dataToSave = { ...order };

    // Create random UUID if not present and this is a NEW order (not sure if strictly needed if DB default is uuid_generate_v4(), but specific logic in orderService had it)
    if (!dataToSave.id && typeof crypto !== "undefined" && crypto.randomUUID) {
        dataToSave.id = crypto.randomUUID();
    }

    const { data, error } = await supabaseAdmin
        .from('orders')
        .upsert(dataToSave)
        .select()
        .single();

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json({ data });
}

export async function DELETE({ request }) {
    const { ids, id } = await request.json();

    const targets = ids || (id ? [id] : []);

    if (targets.length === 0) {
        return json({ error: "Invalid payload" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('orders')
        .delete()
        .in('id', targets);

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
}

export async function PATCH({ request }) {
    const body = await request.json();
    const isArray = Array.isArray(body);
    const updates = isArray ? body : [body];

    // For bulk updates with different values, Supabase .update() doesn't support an array of different objects easily
    // unless all have the same values being updated for a set of IDs.
    // However, our mapped usage in orderService might send single object or bulk same-value updates.
    // If we receive an array of objects with different IDs and different values, we have to loop.
    // orderService.bulkUpdate sends ONE object of updates and a list of IDs?
    // No, I refactored bulkUpdate to: const ordersToUpdate = ids.map(id => ({ id, ...updates }));
    // So it sends an array of objects.

    // We will iterate for now as it's safer for varying updates.
    const results = [];
    let lastError = null;

    for (const update of updates) {
        const { id, ...fields } = update;
        if (!id) continue;

        const { data, error } = await supabaseAdmin
            .from('orders')
            .update(fields)
            .eq('id', id)
            .select()
            .single();

        if (error) lastError = error;
        if (data) results.push(data);
    }

    if (lastError && results.length === 0) {
        return json({ error: lastError.message }, { status: 500 });
    }

    return json({ data: isArray ? results : (results[0] || null) });
}
