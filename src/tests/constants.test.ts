/**
 * Unit tests for the constants module
 */
import { describe, it, expect } from 'vitest';
import {
    ORDER_STATUS,
    GROUP_BY_OPTIONS,
    GROUP_BY_LABELS,
    PAGINATION,
    STATUS_COLORS,
    DEFAULT_STATUS_COLOR,
    PREDEFINED_ORDERED_BY,
} from '$lib/constants';

describe('Constants', () => {
    describe('ORDER_STATUS', () => {
        it('should have all expected status values', () => {
            expect(ORDER_STATUS.REQUESTED).toBe('requested');
            expect(ORDER_STATUS.ORDERED).toBe('ordered');
            expect(ORDER_STATUS.RECEIVED).toBe('received');
            expect(ORDER_STATUS.CANCELLED).toBe('cancelled');
        });

        it('should have exactly 4 statuses', () => {
            expect(Object.keys(ORDER_STATUS)).toHaveLength(4);
        });
    });

    describe('GROUP_BY_OPTIONS', () => {
        it('should have all expected options', () => {
            expect(GROUP_BY_OPTIONS.NONE).toBe('none');
            expect(GROUP_BY_OPTIONS.DATE).toBe('date');
            expect(GROUP_BY_OPTIONS.PROVIDER).toBe('provider');
            expect(GROUP_BY_OPTIONS.REQUESTER).toBe('requester');
            expect(GROUP_BY_OPTIONS.STATUS).toBe('status');
        });
    });

    describe('GROUP_BY_LABELS', () => {
        it('should have a label for each option', () => {
            expect(GROUP_BY_LABELS[GROUP_BY_OPTIONS.NONE]).toBe('No Grouping');
            expect(GROUP_BY_LABELS[GROUP_BY_OPTIONS.DATE]).toBe('Group by Date');
            expect(GROUP_BY_LABELS[GROUP_BY_OPTIONS.PROVIDER]).toBe('Group by Provider');
            expect(GROUP_BY_LABELS[GROUP_BY_OPTIONS.REQUESTER]).toBe('Group by Requester');
            expect(GROUP_BY_LABELS[GROUP_BY_OPTIONS.STATUS]).toBe('Group by Status');
        });
    });

    describe('PAGINATION', () => {
        it('should have default page size', () => {
            expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(50);
        });

        it('should have page size options', () => {
            expect(PAGINATION.PAGE_SIZE_OPTIONS).toContain(25);
            expect(PAGINATION.PAGE_SIZE_OPTIONS).toContain(50);
            expect(PAGINATION.PAGE_SIZE_OPTIONS).toContain(100);
        });
    });

    describe('STATUS_COLORS', () => {
        it('should have color for each status', () => {
            expect(STATUS_COLORS[ORDER_STATUS.RECEIVED]).toContain('emerald');
            expect(STATUS_COLORS[ORDER_STATUS.CANCELLED]).toContain('red');
            expect(STATUS_COLORS[ORDER_STATUS.REQUESTED]).toContain('amber');
            expect(STATUS_COLORS[ORDER_STATUS.ORDERED]).toContain('blue');
        });
    });

    describe('DEFAULT_STATUS_COLOR', () => {
        it('should match requested status color', () => {
            expect(DEFAULT_STATUS_COLOR).toBe(STATUS_COLORS[ORDER_STATUS.REQUESTED]);
        });
    });

    describe('PREDEFINED_ORDERED_BY', () => {
        it('should have predefined values', () => {
            expect(PREDEFINED_ORDERED_BY).toContain('ARN');
            expect(PREDEFINED_ORDERED_BY).toContain('MA');
            expect(PREDEFINED_ORDERED_BY).toContain('FM');
            expect(PREDEFINED_ORDERED_BY).toContain('DA');
        });
    });
});
