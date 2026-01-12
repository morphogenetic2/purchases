import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    if (event.url.pathname !== '/login') {
        const token = event.cookies.get('lab_access_token');
        if (!token) {
            throw redirect(303, '/login');
        }
    }
    return resolve(event);
};
