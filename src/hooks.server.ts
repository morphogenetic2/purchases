import { error, redirect, type Handle } from '@sveltejs/kit';
import { LAB_PASSWORD } from '$env/static/private';
import { hasValidLabAccessToken } from '$lib/server/labAccess';

export const handle: Handle = async ({ event, resolve }) => {
    if (event.url.pathname !== '/login') {
        const token = event.cookies.get('lab_access_token');
        if (!hasValidLabAccessToken(token, LAB_PASSWORD)) {
            if (event.url.pathname.startsWith('/api/')) {
                throw error(401, 'Unauthorized');
            }
            throw redirect(303, '/login');
        }
    }
    return resolve(event);
};
