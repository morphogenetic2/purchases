import { redirect, type Handle } from '@sveltejs/kit';

const VALID_TOKEN = 'authenticated';

export const handle: Handle = async ({ event, resolve }) => {
    // Allow API routes to bypass auth check (they handle their own auth)
    // The previous rule didn't actually check for /api properly
    const isApi = event.url.pathname.startsWith('/api/');
    if (!isApi && event.url.pathname !== '/login') {
        const token = event.cookies.get('lab_access_token');
        // Verify the token value, not just its existence
        if (token !== VALID_TOKEN) {
            throw redirect(303, '/login');
        }
    }
    return resolve(event);
};

export { VALID_TOKEN };
