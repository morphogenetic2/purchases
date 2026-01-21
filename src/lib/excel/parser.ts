/**
 * Excel file parsing utilities.
 * Handles reading Excel files and extracting headers/preview data.
 */

import * as XLSX from 'xlsx';
import { DB_FIELDS, type FieldDefinition } from './fieldDefinitions';

export interface ParseResult {
    headers: string[];
    previewData: any[];
    allData: any[];
    autoMapping: Record<string, string>;
}

/**
 * Parse an Excel file and extract headers, preview data, and auto-mapped fields.
 */
export function parseExcelBuffer(binaryString: string): ParseResult {
    const workbook = XLSX.read(binaryString, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get raw data with headers as first row
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (rawData.length === 0) {
        return {
            headers: [],
            previewData: [],
            allData: [],
            autoMapping: {},
        };
    }

    const headers = rawData[0] as string[];
    const previewData = rawData.slice(1, 6); // First 5 data rows

    // Get all data as JSON objects
    const allData = XLSX.utils.sheet_to_json(worksheet);

    // Auto-map headers that match field keys or labels
    const autoMapping = createAutoMapping(headers, DB_FIELDS);

    return {
        headers,
        previewData,
        allData,
        autoMapping,
    };
}

/**
 * Creates automatic mapping from Excel headers to DB fields.
 */
export function createAutoMapping(
    headers: string[],
    fields: FieldDefinition[]
): Record<string, string> {
    const mapping: Record<string, string> = {};

    fields.forEach((field) => {
        const match = headers.find(
            (h) => {
                if (!h) return false;
                const headerLower = h.toLowerCase();
                // Check key match
                if (headerLower === field.key.toLowerCase()) return true;
                // Check label match
                if (headerLower === field.label.toLowerCase()) return true;
                // Check aliases match
                if (field.aliases?.some(alias => alias.toLowerCase() === headerLower)) return true;

                return false;
            }
        );
        if (match) {
            mapping[field.key] = match;
        }
    });

    return mapping;
}

/**
 * Read a File object and return the binary string.
 */
export function readFileAsBinaryString(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (evt.target?.result) {
                resolve(evt.target.result as string);
            } else {
                reject(new Error('Failed to read file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsBinaryString(file);
    });
}
