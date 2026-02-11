import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import ReceiveDialog from '$lib/components/ReceiveDialog.svelte';
import type { Order } from '$lib/types';

const orderServiceMocks = vi.hoisted(() => ({
    updateOrder: vi.fn(),
    bulkReceive: vi.fn(),
}));

vi.mock('$lib/services/orderService', () => ({
    orderService: {
        updateOrder: orderServiceMocks.updateOrder,
        bulkReceive: orderServiceMocks.bulkReceive,
    },
}));

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: 'order-1',
        created_at: '2026-02-01T00:00:00.000Z',
        description: 'Test Order',
        provider: 'Sigma',
        ordered_by: 'ARN',
        quantity: 5,
        status: 'requested',
        ...overrides,
    };
}

describe('ReceiveDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('alert', vi.fn());
        orderServiceMocks.updateOrder.mockResolvedValue({ data: {}, error: null });
        orderServiceMocks.bulkReceive.mockResolvedValue({ data: true, error: null });
    });

    it('rejects non-positive quantity for single-order receive', async () => {
        render(ReceiveDialog, {
            props: {
                isOpen: true,
                orders: [
                    makeOrder({
                        id: 'single-1',
                        quantity: 5,
                        quantity_received: 2,
                    }),
                ],
                onSave: vi.fn(),
            },
        });

        const quantityInput = await screen.findByLabelText(/Quantity to Receive/i);
        await fireEvent.input(quantityInput, { target: { value: '0' } });
        await fireEvent.click(
            screen.getByRole('button', { name: /Mark as Received/i }),
        );

        await waitFor(() => {
            expect(globalThis.alert).toHaveBeenCalledWith(
                expect.stringContaining('at least 1'),
            );
        });
        expect(orderServiceMocks.updateOrder).not.toHaveBeenCalled();
    });

    it('uses bulkReceive with trimmed storage location for multi-order receive', async () => {
        render(ReceiveDialog, {
            props: {
                isOpen: true,
                orders: [
                    makeOrder({ id: 'bulk-1', quantity: 3 }),
                    makeOrder({ id: 'bulk-2', quantity: 7 }),
                ],
                onSave: vi.fn(),
            },
        });

        await fireEvent.input(
            await screen.findByLabelText(/Reception Date/i),
            { target: { value: '2026-02-10' } },
        );
        await fireEvent.input(
            await screen.findByLabelText(/Storage Location/i),
            { target: { value: '  Freezer Shelf 3  ' } },
        );
        await fireEvent.click(
            screen.getByRole('button', { name: /Mark as Received/i }),
        );

        await waitFor(() => {
            expect(orderServiceMocks.bulkReceive).toHaveBeenCalledTimes(1);
        });

        expect(orderServiceMocks.bulkReceive).toHaveBeenCalledWith(
            ['bulk-1', 'bulk-2'],
            {
                receivedDate: '2026-02-10',
                storageLocation: 'Freezer Shelf 3',
            },
        );
        expect(orderServiceMocks.updateOrder).not.toHaveBeenCalled();
    });
});
