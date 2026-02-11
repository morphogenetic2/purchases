import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { invalidateAll } from '$app/navigation';
import ExcelIngestor from '$lib/components/ExcelIngestor.svelte';

const excelMocks = vi.hoisted(() => ({
    readFileAsBinaryString: vi.fn(),
    parseExcelBuffer: vi.fn(),
    transformExcelToOrders: vi.fn(),
    validateOrders: vi.fn(),
    formatValidationErrors: vi.fn(),
}));

const orderServiceMocks = vi.hoisted(() => ({
    insertOrders: vi.fn(),
}));

vi.mock('$lib/excel', () => ({
    DB_FIELDS: [
        { key: 'description', label: 'Description', required: true },
        { key: 'provider', label: 'Provider', required: true },
    ],
    readFileAsBinaryString: excelMocks.readFileAsBinaryString,
    parseExcelBuffer: excelMocks.parseExcelBuffer,
    transformExcelToOrders: excelMocks.transformExcelToOrders,
    validateOrders: excelMocks.validateOrders,
    formatValidationErrors: excelMocks.formatValidationErrors,
}));

vi.mock('$lib/services/orderService', () => ({
    orderService: {
        insertOrders: orderServiceMocks.insertOrders,
    },
}));

async function openMappingModal(container: HTMLElement) {
    await fireEvent.click(
        screen.getByRole('button', { name: /Import \/ Append Orders/i }),
    );

    const fileInput = container.querySelector(
        'input[type="file"]',
    ) as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const file = new File(['fake'], 'orders.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    Object.defineProperty(fileInput!, 'files', {
        configurable: true,
        value: [file],
    });

    await fireEvent.change(fileInput!);
    await screen.findByText('Map Columns');
}

describe('ExcelIngestor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('alert', vi.fn());

        excelMocks.readFileAsBinaryString.mockResolvedValue('binary-content');
        excelMocks.parseExcelBuffer.mockReturnValue({
            headers: ['Description', 'Provider'],
            previewData: [['Acetone', 'Sigma']],
            allData: [{ Description: 'Acetone', Provider: 'Sigma' }],
            autoMapping: {
                description: 'Description',
                provider: 'Provider',
            },
        });
        excelMocks.transformExcelToOrders.mockReturnValue({
            orders: [
                {
                    description: 'Acetone',
                    provider: 'Sigma',
                    ordered_by: 'ARN',
                    quantity: 1,
                    status: 'requested',
                },
            ],
            skippedCount: 0,
        });
        excelMocks.formatValidationErrors.mockReturnValue('Validation failed');

        orderServiceMocks.insertOrders.mockResolvedValue({ data: true, error: null });
        vi.mocked(invalidateAll).mockResolvedValue(undefined as never);
    });

    it('keeps mapping modal open when validation fails', async () => {
        excelMocks.validateOrders.mockReturnValue({
            valid: false,
            errors: [{ index: 0, description: 'Acetone', missingFields: ['Provider'] }],
        });

        const { container } = render(ExcelIngestor, {
            props: { requesters: [] },
        });

        await openMappingModal(container);
        await fireEvent.click(
            screen.getByRole('button', { name: /Import Orders/i }),
        );

        await waitFor(() => {
            expect(globalThis.alert).toHaveBeenCalledWith('Validation failed');
        });
        expect(orderServiceMocks.insertOrders).not.toHaveBeenCalled();
        expect(screen.getByText('Map Columns')).toBeInTheDocument();
    });

    it('closes mapping modal after successful upload', async () => {
        excelMocks.validateOrders.mockReturnValue({
            valid: true,
            errors: [],
        });

        const { container } = render(ExcelIngestor, {
            props: { requesters: [] },
        });

        await openMappingModal(container);
        await fireEvent.click(
            screen.getByRole('button', { name: /Import Orders/i }),
        );

        await waitFor(() => {
            expect(orderServiceMocks.insertOrders).toHaveBeenCalledTimes(1);
            expect(invalidateAll).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            expect(screen.queryByText('Map Columns')).not.toBeInTheDocument();
        });
    });
});
