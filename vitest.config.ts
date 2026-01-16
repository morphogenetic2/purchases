import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/tests/setup.ts'],
        // Resolve $lib alias
        alias: {
            $lib: '/src/lib',
        },
    },
});
