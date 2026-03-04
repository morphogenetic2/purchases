import { json, error } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    const { data: requesters, error: dbError } = await supabaseAdmin
        .from('requesters')
        .select('*')
        .order('full_name', { ascending: true });

    if (dbError) {
        throw error(500, dbError.message);
    }

    return json(requesters);
};

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    const { full_name, initials, id } = body;

    if (!full_name || !initials) {
        throw error(400, 'Full name and initials are required');
    }

    const { data, error: dbError } = await supabaseAdmin
        .from('requesters')
        .upsert({ id, full_name, initials })
        .select()
        .single();

    if (dbError) {
        throw error(500, dbError.message);
    }

    return json(data);
};

export const DELETE: RequestHandler = async ({ request }) => {
    const { id } = await request.json();

    if (!id) {
        throw error(400, 'ID is required');
    }

    const { error: dbError } = await supabaseAdmin
        .from('requesters')
        .delete()
        .eq('id', id);

    if (dbError) {
        throw error(500, dbError.message);
    }

    return json({ success: true });
};
