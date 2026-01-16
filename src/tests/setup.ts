import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock Supabase client for tests
vi.mock('$lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
    },
}));

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
    invalidateAll: vi.fn(),
    goto: vi.fn(),
}));
