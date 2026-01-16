/**
 * Unit tests for utility functions
 */
import { describe, it, expect } from 'vitest';
import { getStatusColor, cn } from '$lib/utils';
import { ORDER_STATUS, STATUS_COLORS, DEFAULT_STATUS_COLOR } from '$lib/constants';

describe('Utils', () => {
    describe('getStatusColor', () => {
        it('should return emerald for received status', () => {
            const color = getStatusColor('received');
            expect(color).toContain('emerald');
        });

        it('should return red for cancelled status', () => {
            const color = getStatusColor('cancelled');
            expect(color).toContain('red');
        });

        it('should return amber for requested status', () => {
            const color = getStatusColor('requested');
            expect(color).toContain('amber');
        });

        it('should return blue for ordered status', () => {
            const color = getStatusColor('ordered');
            expect(color).toContain('blue');
        });

        it('should be case-insensitive', () => {
            expect(getStatusColor('RECEIVED')).toContain('emerald');
            expect(getStatusColor('Cancelled')).toContain('red');
        });

        it('should return default color for unknown status', () => {
            const color = getStatusColor('unknown');
            expect(color).toBe(DEFAULT_STATUS_COLOR);
        });

        it('should return default color for null/undefined', () => {
            expect(getStatusColor(null as any)).toBe(DEFAULT_STATUS_COLOR);
            expect(getStatusColor(undefined as any)).toBe(DEFAULT_STATUS_COLOR);
        });
    });

    describe('cn (className merge)', () => {
        it('should merge class names', () => {
            const result = cn('class1', 'class2');
            expect(result).toContain('class1');
            expect(result).toContain('class2');
        });

        it('should handle conditional classes', () => {
            const result = cn('base', true && 'included', false && 'excluded');
            expect(result).toContain('base');
            expect(result).toContain('included');
            expect(result).not.toContain('excluded');
        });

        it('should merge Tailwind classes correctly', () => {
            // tailwind-merge should keep the last one
            const result = cn('px-4', 'px-2');
            expect(result).toBe('px-2');
        });
    });
});
