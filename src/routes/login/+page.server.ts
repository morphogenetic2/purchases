import { fail, redirect } from '@sveltejs/kit';
import { LAB_PASSWORD } from '$env/static/private';
import type { Actions } from './$types';
import { VALID_TOKEN } from '../../hooks.server';

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const password = data.get('password');

        if (password === LAB_PASSWORD) {
            cookies.set('lab_access_token', VALID_TOKEN, {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
            throw redirect(303, '/');
        }

        return fail(400, { incorrect: true });
    }
};
