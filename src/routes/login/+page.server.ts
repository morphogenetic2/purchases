import { fail, redirect } from '@sveltejs/kit';
import { LAB_PASSWORD } from '$env/static/private';
import type { Actions } from './$types';
import { createLabAccessToken, SESSION_MAX_AGE_SECONDS } from '$lib/server/labAccess';

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const password = data.get('password');

        if (password === LAB_PASSWORD) {
            cookies.set('lab_access_token', createLabAccessToken(LAB_PASSWORD), {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
                maxAge: SESSION_MAX_AGE_SECONDS
            });
            throw redirect(303, '/');
        }

        return fail(400, { incorrect: true });
    }
};
