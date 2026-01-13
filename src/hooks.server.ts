import { redirect, type Handle } from '@sveltejs/kit';

const VALID_TOKEN = 'authenticated';

export const handle: Handle = async ({ event, resolve }) => {
    // Allow API routes to bypass auth check (they handle their own auth)
    if (event.url.pathname !== '/login' && !event.url.pathname.startsWith('/api/')) {
        const token = event.cookies.get('lab_access_token');
        // Verify the token value, not just its existence
        if (token !== VALID_TOKEN) {
            throw redirect(303, '/login');
        }
    }
    return resolve(event);
};

export { VALID_TOKEN };
