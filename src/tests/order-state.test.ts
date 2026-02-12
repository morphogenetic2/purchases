import { beforeEach, describe, expect, it } from 'vitest';
import { OrderState } from '$lib/state/orderState.svelte';
import { GROUP_BY_OPTIONS, ORDER_STATUS } from '$lib/constants';
import type { Order } from '$lib/types';

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: 'order-1',
        created_at: '2026-02-01T00:00:00.000Z',
        description: 'Sample order',
        provider: 'Sigma',
        ordered_by: 'ARN',
        quantity: 1,
        status: ORDER_STATUS.REQUESTED,
        ...overrides,
    };
}

describe('OrderState presets', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('saves and reapplies a custom preset', () => {
        const state = new OrderState([
            makeOrder({ id: 'a' }),
            makeOrder({ id: 'b', ordered_by: 'MA', status: ORDER_STATUS.ORDERED }),
        ]);

        state.searchTerm = 'sigma';
        state.activeFilters.requester = ['ARN'];
        state.activeFilters.status = [ORDER_STATUS.REQUESTED];
        state.setGroupBy(GROUP_BY_OPTIONS.REQUESTER);

        const mode = state.saveCurrentPreset('Requester ARN');
        expect(mode).toBe('created');
        expect(state.customPresets).toHaveLength(1);

        state.searchTerm = '';
        state.activeFilters.requester = [];
        state.activeFilters.status = [];
        state.setGroupBy(GROUP_BY_OPTIONS.DATE);

        const applied = state.applySavedPreset(state.customPresets[0].id);
        expect(applied).toBe(true);
        expect(state.searchTerm).toBe('sigma');
        expect(state.activeFilters.requester).toEqual(['ARN']);
        expect(state.activeFilters.status).toEqual([ORDER_STATUS.REQUESTED]);
        expect(state.groupBy).toBe(GROUP_BY_OPTIONS.REQUESTER);
    });

    it('applies requested-this-week preset', () => {
        const today = new Date().toISOString().split('T')[0];
        const oldDate = '2020-01-01';
        const state = new OrderState([
            makeOrder({ id: 'today-req', order_date: today, status: ORDER_STATUS.REQUESTED }),
            makeOrder({ id: 'today-rec', order_date: today, status: ORDER_STATUS.RECEIVED }),
            makeOrder({ id: 'old-req', order_date: oldDate, status: ORDER_STATUS.REQUESTED }),
        ]);

        state.applyBuiltInPreset('requested_this_week');

        expect(state.activeFilters.status).toEqual([ORDER_STATUS.REQUESTED]);
        expect(state.groupBy).toBe(GROUP_BY_OPTIONS.DATE);
        expect(state.activeFilters.date).toContain(today);
        expect(state.filteredOrders.some((o) => o.id === 'today-req')).toBe(true);
    });

    it('applies pending-by-requester preset', () => {
        const state = new OrderState([
            makeOrder({ id: 'requested', status: ORDER_STATUS.REQUESTED }),
            makeOrder({ id: 'ordered', status: ORDER_STATUS.ORDERED }),
            makeOrder({ id: 'partial', status: ORDER_STATUS.PARTIALLY_RECEIVED }),
            makeOrder({ id: 'received', status: ORDER_STATUS.RECEIVED }),
        ]);

        state.applyBuiltInPreset('pending_by_requester');

        expect(state.groupBy).toBe(GROUP_BY_OPTIONS.REQUESTER);
        expect(state.activeFilters.status).toEqual([
            ORDER_STATUS.REQUESTED,
            ORDER_STATUS.ORDERED,
            ORDER_STATUS.PARTIALLY_RECEIVED,
        ]);
        expect(state.filteredOrders.some((o) => o.id === 'received')).toBe(false);
    });
});
