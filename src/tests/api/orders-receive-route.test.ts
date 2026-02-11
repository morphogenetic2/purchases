import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORDER_STATUS } from '$lib/constants';

const supabaseState = vi.hoisted(() => ({
    fromMock: vi.fn(),
    selectedOrders: [] as Array<{ id: string; quantity: number }>,
    selectError: null as { message: string } | null,
    updateError: null as { message: string } | null,
    updateCalls: [] as Array<{ id: string; fields: Record<string, unknown> }>,
}));

vi.mock('$lib/server/supabaseAdmin', () => ({
    supabaseAdmin: {
        from: supabaseState.fromMock,
    },
}));

import { POST } from '../../routes/api/orders/receive/+server';

function makeRequest(body: unknown): Request {
    return new Request('http://localhost/api/orders/receive', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/orders/receive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        supabaseState.selectedOrders = [];
        supabaseState.selectError = null;
        supabaseState.updateError = null;
        supabaseState.updateCalls = [];

        supabaseState.fromMock.mockImplementation(() => ({
            select: () => ({
                in: vi.fn().mockResolvedValue({
                    data: supabaseState.selectedOrders,
                    error: supabaseState.selectError,
                }),
            }),
            update: (fields: Record<string, unknown>) => ({
                eq: vi
                    .fn()
                    .mockImplementation(async (_column: string, id: string) => {
                        supabaseState.updateCalls.push({ id, fields });
                        return { error: supabaseState.updateError };
                    }),
            }),
        }));
    });

    it('sets received fields including quantity_received and optional metadata', async () => {
        supabaseState.selectedOrders = [
            { id: 'order-1', quantity: 3 },
            { id: 'order-2', quantity: 7 },
        ];

        const response = await POST({
            request: makeRequest({
                ids: ['order-1', 'order-2'],
                receivedDate: '2026-02-10',
                storageLocation: 'Cold Rack A',
            }),
        } as any);

        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ success: true, updated: 2 });
        expect(supabaseState.updateCalls).toHaveLength(2);

        const order1Call = supabaseState.updateCalls.find(
            (call) => call.id === 'order-1',
        );
        const order2Call = supabaseState.updateCalls.find(
            (call) => call.id === 'order-2',
        );

        expect(order1Call?.fields).toMatchObject({
            status: ORDER_STATUS.RECEIVED,
            received_date: '2026-02-10',
            is_received: true,
            quantity_received: 3,
            storage_location: 'Cold Rack A',
        });
        expect(order2Call?.fields).toMatchObject({
            status: ORDER_STATUS.RECEIVED,
            received_date: '2026-02-10',
            is_received: true,
            quantity_received: 7,
            storage_location: 'Cold Rack A',
        });
    });

    it('returns 400 and skips DB work for empty ids', async () => {
        const response = await POST({
            request: makeRequest({ ids: [] }),
        } as any);

        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({ error: 'Invalid payload' });
        expect(supabaseState.fromMock).not.toHaveBeenCalled();
    });
});
