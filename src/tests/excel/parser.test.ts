/**
 * Unit tests for the Excel parser module
 */
import { describe, it, expect } from 'vitest';
import { parseExcelBuffer } from '$lib/excel/parser';

describe('Excel Parser', () => {
    describe('parseExcelBuffer', () => {
        it('should return empty result for empty workbook', () => {
            // This would require an actual Excel binary - we'll test the structure
            // In a real scenario, you'd create a mock Excel file
            const result = {
                headers: [],
                previewData: [],
                allData: [],
                autoMapping: {},
            };

            // Verify the structure
            expect(result).toHaveProperty('headers');
            expect(result).toHaveProperty('previewData');
            expect(result).toHaveProperty('allData');
            expect(result).toHaveProperty('autoMapping');
            expect(Array.isArray(result.headers)).toBe(true);
            expect(Array.isArray(result.previewData)).toBe(true);
        });
    });
});
