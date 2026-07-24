import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
    invalidateAll: vi.fn(),
    goto: vi.fn(),
}));
