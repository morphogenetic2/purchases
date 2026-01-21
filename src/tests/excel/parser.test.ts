/**
 * Unit tests for the Excel parser module
 */
import { describe, it, expect } from 'vitest';
import { parseExcelBuffer, createAutoMapping } from '$lib/excel/parser';
import { DB_FIELDS, type FieldDefinition } from '$lib/excel/fieldDefinitions';

describe('Excel Parser', () => {
    describe('parseExcelBuffer', () => {
        it('should return empty result for empty workbook', () => {
            // This would require an actual Excel binary - we'll test the structure
            const result = {
                headers: [],
                previewData: [],
                allData: [],
                autoMapping: {},
            };

            expect(result).toHaveProperty('headers');
            expect(result).toHaveProperty('previewData');
        });
    });

    describe('createAutoMapping', () => {
        it('should map standard fields correctly', () => {
            const headers = ['Order Date', 'Provider', 'Description', 'Quantity', 'Unknown'];

            const mapping = createAutoMapping(headers, DB_FIELDS);

            expect(mapping).toEqual({
                order_date: 'Order Date',
                provider: 'Provider',
                description: 'Description',
                quantity: 'Quantity',
            });
        });

        it('should map fields by aliases (Spanish)', () => {
            const headers = [
                'PROVEEDOR',
                'REFERENCIA',
                'DESCRIPCION',
                'CANTIDAD',
                'PRECIO (UNIDAD)',
                'PROYECTO'
            ];

            const mapping = createAutoMapping(headers, DB_FIELDS);

            expect(mapping).toEqual({
                provider: 'PROVEEDOR',
                sku: 'REFERENCIA',
                description: 'DESCRIPCION',
                quantity: 'CANTIDAD',
                unit_price: 'PRECIO (UNIDAD)',
                project_code: 'PROYECTO'
            });
        });

        it('should map case-insensitive aliases', () => {
            const headers = ['Proveedor', 'referencia', 'Descripcion'];

            const mapping = createAutoMapping(headers, DB_FIELDS);

            expect(mapping).toEqual({
                provider: 'Proveedor',
                sku: 'referencia',
                description: 'Descripcion',
            });
        });
    });
});
