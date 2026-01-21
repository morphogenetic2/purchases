/**
 * Unit tests for the Excel transformer module
 */
import { describe, it, expect } from 'vitest';
import { transformExcelToOrders } from '$lib/excel/transformer';
import { ORDER_STATUS } from '$lib/constants';

describe('Excel Transformer', () => {
    const defaultOptions = {
        mapping: {
            description: 'Description',
            provider: 'Provider',
            ordered_by: 'Ordered By',
            quantity: 'Qty',
            unit_price: 'Price',
            sku: 'SKU',
        },
        defaultOrderedBy: 'ARN',
        defaultOrderDate: '2024-01-15',
        forceNew: false,
    };

    describe('transformExcelToOrders', () => {
        it('should transform Excel rows to order objects', () => {
            const excelData = [
                {
                    Description: 'Test Chemical',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                    Qty: '5',
                    Price: '123.45',
                    SKU: 'abc123',
                },
            ];

            const { orders, skippedCount } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders).toHaveLength(1);
            expect(skippedCount).toBe(0);
            expect(orders[0]).toEqual(
                expect.objectContaining({
                    description: 'Test Chemical',
                    provider: 'Sigma',
                    ordered_by: 'John',
                    quantity: 5,
                    unit_price: 123.45,
                    sku: 'ABC123', // Should be uppercase
                    status: ORDER_STATUS.REQUESTED,
                })
            );
        });

        it('should use default ordered_by when not mapped', () => {
            const excelData = [
                {
                    Description: 'Test Chemical',
                    Provider: 'Sigma',
                },
            ];

            const options = {
                ...defaultOptions,
                mapping: {
                    description: 'Description',
                    provider: 'Provider',
                },
            };

            const { orders } = transformExcelToOrders(excelData, options);

            expect(orders[0].ordered_by).toBe('ARN');
        });

        it('should use default order_date when not mapped', () => {
            const excelData = [
                {
                    Description: 'Test Chemical',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                },
            ];

            const { orders } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders[0].order_date).toBe('2024-01-15');
        });

        it('should convert quantity to integer', () => {
            const excelData = [
                {
                    Description: 'Test',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                    Qty: '3.7',
                },
            ];

            const { orders } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders[0].quantity).toBe(3);
        });

        it('should default quantity to 1 for invalid values', () => {
            const excelData = [
                {
                    Description: 'Test',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                    Qty: 'invalid',
                },
            ];

            const { orders } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders[0].quantity).toBe(1);
        });

        it('should convert unit_price to float', () => {
            const excelData = [
                {
                    Description: 'Test',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                    Price: '99.99',
                },
            ];

            const { orders } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders[0].unit_price).toBe(99.99);
        });

        it('should default unit_price to 0 for invalid values', () => {
            const excelData = [
                {
                    Description: 'Test',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                    Price: 'expensive',
                },
            ];

            const { orders } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders[0].unit_price).toBe(0);
        });

        it('should convert SKU to uppercase', () => {
            const excelData = [
                {
                    Description: 'Test',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                    SKU: 'abc-123-def',
                },
            ];

            const { orders } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders[0].sku).toBe('ABC-123-DEF');
        });

        it('should handle forceNew option', () => {
            const excelData = [
                {
                    Description: 'Test',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                },
            ];

            const options = {
                ...defaultOptions,
                forceNew: true,
            };

            const { orders } = transformExcelToOrders(excelData, options);

            expect(orders[0].status).toBe(ORDER_STATUS.REQUESTED);
            expect(orders[0].is_received).toBe(false);
            expect(orders[0].received_date).toBeNull();
        });

        it('should skip empty rows', () => {
            const excelData = [
                {
                    Description: 'Valid Order',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                },
                {
                    // Empty row - no required fields
                    Qty: '5',
                },
                {
                    Description: 'Another Valid',
                    Provider: 'Fisher',
                    'Ordered By': 'Jane',
                },
            ];

            const { orders, skippedCount } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders).toHaveLength(2);
            expect(skippedCount).toBe(1);
        });

        it('should trim whitespace from string values', () => {
            const excelData = [
                {
                    Description: '  Test Chemical  ',
                    Provider: '  Sigma  ',
                    'Ordered By': '  John  ',
                },
            ];

            const { orders } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders[0].description).toBe('Test Chemical');
            expect(orders[0].provider).toBe('Sigma');
            expect(orders[0].ordered_by).toBe('John');
        });

        it('should handle Excel serial date format', () => {
            const excelData = [
                {
                    Description: 'Test',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                },
            ];

            // Excel serial date for 2024-01-15 is approximately 45306
            const optionsWithDateMapping = {
                ...defaultOptions,
                mapping: {
                    ...defaultOptions.mapping,
                    order_date: 'Date',
                },
            };

            // The transformer should handle this
            const { orders } = transformExcelToOrders(
                [{ ...excelData[0], Date: 45306 }],
                optionsWithDateMapping
            );

            expect(orders[0].order_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should ignore rows with distinct provider separator text', () => {
            const excelData = [
                {
                    Description: 'Valid Order',
                    Provider: 'Sigma',
                    'Ordered By': 'John',
                },
                {
                    Provider: 'DEBEN ORDENAR LOS PRODUCTOS SEPARADOS POR PROVEEDOR',
                },
                {
                    Description: 'Another Valid',
                    Provider: 'Fisher',
                    'Ordered By': 'Jane',
                },
            ];

            const { orders, skippedCount } = transformExcelToOrders(excelData, defaultOptions);

            expect(orders).toHaveLength(2);
            expect(skippedCount).toBe(0);
        });
    });
});
