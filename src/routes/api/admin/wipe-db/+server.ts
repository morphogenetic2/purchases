import { json } from '@sveltejs/kit';
import { LAB_PASSWORD } from '$env/static/private';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export async function POST({ request }) {
    const { password } = await request.json();

    if (password !== LAB_PASSWORD) {
        return json({ error: "Incorrect password" }, { status: 401 });
    }

    // Perform wipe
    // Using simple delete where id is not zero-uuid (to match previous logic) or just delete all.
    const { error } = await supabaseAdmin
        .from('orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
}
