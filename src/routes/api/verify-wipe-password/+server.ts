import { json } from '@sveltejs/kit';
import { LAB_PASSWORD } from '$env/static/private';

export async function POST({ request }) {
    const { password } = await request.json();

    // Check if the provided password matches the environment variable
    const isValid = password === LAB_PASSWORD;

    return json({ valid: isValid });
}
