import { supabase } from '$lib/supabaseClient';

export const load = async () => {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
    }

    return {
        orders: data || []
    };
};
