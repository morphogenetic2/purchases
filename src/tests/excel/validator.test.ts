/**
 * Unit tests for the Excel validator module
 */
import { describe, it, expect } from 'vitest';
import { validateOrders, formatValidationErrors } from '$lib/excel/validator';

describe('Excel Validator', () => {
    describe('validateOrders', () => {
        it('should pass valid orders', () => {
            const orders = [
                {
                    description: 'Test Chemical',
                    provider: 'Sigma',
                    ordered_by: 'John',
                },
                {
                    description: 'Another Chemical',
                    provider: 'Fisher',
                    ordered_by: 'Jane',
                },
            ];

            const result = validateOrders(orders);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail when description is missing', () => {
            const orders = [
                {
                    provider: 'Sigma',
                    ordered_by: 'John',
                },
            ];

            const result = validateOrders(orders);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].missingFields).toContain('Description');
        });

        it('should fail when provider is missing', () => {
            const orders = [
                {
                    description: 'Test',
                    ordered_by: 'John',
                },
            ];

            const result = validateOrders(orders);

            expect(result.valid).toBe(false);
            expect(result.errors[0].missingFields).toContain('Provider');
        });

        it('should fail when ordered_by is missing', () => {
            const orders = [
                {
                    description: 'Test',
                    provider: 'Sigma',
                },
            ];

            const result = validateOrders(orders);

            expect(result.valid).toBe(false);
            expect(result.errors[0].missingFields).toContain('Ordered By');
        });

        it('should report multiple missing fields', () => {
            const orders = [
                {
                    quantity: 5,
                },
            ];

            const result = validateOrders(orders);

            expect(result.valid).toBe(false);
            expect(result.errors[0].missingFields).toContain('Description');
            expect(result.errors[0].missingFields).toContain('Provider');
            expect(result.errors[0].missingFields).toContain('Ordered By');
        });

        it('should validate multiple orders independently', () => {
            const orders = [
                {
                    description: 'Valid Order',
                    provider: 'Sigma',
                    ordered_by: 'John',
                },
                {
                    description: 'Invalid Order',
                    // Missing provider and ordered_by
                },
            ];

            const result = validateOrders(orders);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].index).toBe(1);
            expect(result.errors[0].description).toBe('Invalid Order');
        });

        it('should include order description in error', () => {
            const orders = [
                {
                    description: 'Missing Required Fields',
                },
            ];

            const result = validateOrders(orders);

            expect(result.errors[0].description).toBe('Missing Required Fields');
        });

        it('should use "Unknown" for orders without description', () => {
            const orders = [
                {
                    quantity: 5,
                },
            ];

            const result = validateOrders(orders);

            expect(result.errors[0].description).toBe('Unknown');
        });
    });

    describe('formatValidationErrors', () => {
        it('should return empty string for valid result', () => {
            const result = { valid: true, errors: [] };

            const formatted = formatValidationErrors(result);

            expect(formatted).toBe('');
        });

        it('should format single error', () => {
            const result = {
                valid: false,
                errors: [
                    {
                        index: 0,
                        description: 'Test Chemical',
                        missingFields: ['Provider', 'Ordered By'],
                    },
                ],
            };

            const formatted = formatValidationErrors(result);

            expect(formatted).toContain('Test Chemical');
            expect(formatted).toContain('Provider');
            expect(formatted).toContain('Ordered By');
        });

        it('should format multiple errors', () => {
            const result = {
                valid: false,
                errors: [
                    {
                        index: 0,
                        description: 'Order 1',
                        missingFields: ['Provider'],
                    },
                    {
                        index: 2,
                        description: 'Order 3',
                        missingFields: ['Description'],
                    },
                ],
            };

            const formatted = formatValidationErrors(result);

            expect(formatted).toContain('2 orders have validation errors');
            expect(formatted).toContain('Order 1');
            expect(formatted).toContain('Order 3');
        });
    });
});
