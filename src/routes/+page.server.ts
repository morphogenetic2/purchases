import { supabase } from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const { data, error: dbError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (dbError) {
        console.error('Error fetching orders:', dbError);
        throw error(500, 'Failed to load orders. Please try again later.');
    }

    return {
        orders: data || []
    };
};
