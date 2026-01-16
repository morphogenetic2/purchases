/**
 * Excel data transformation utilities.
 * Transforms raw Excel data into Order objects ready for database insertion.
 */

import { ORDER_STATUS } from '$lib/constants';
import { DB_FIELDS } from './fieldDefinitions';

export interface TransformOptions {
    mapping: Record<string, string>;
    defaultOrderedBy: string;
    defaultOrderDate: string;
    forceNew: boolean;
}

export interface TransformResult {
    orders: any[];
    skippedCount: number;
}

/**
 * Transform raw Excel data rows into Order objects.
 */
export function transformExcelToOrders(
    jsonData: any[],
    options: TransformOptions
): TransformResult {
    const { mapping, defaultOrderedBy, defaultOrderDate, forceNew } = options;
    let skippedCount = 0;

    const orders = jsonData.map((row: any) => {
        const newRow: any = {};

        DB_FIELDS.forEach((field) => {
            const excelHeader = mapping[field.key];

            if (excelHeader) {
                let val = row[excelHeader];

                // Trim strings
                if (typeof val === 'string') {
                    val = val.trim();
                }

                // Field-specific transformations
                val = transformFieldValue(field.key, val, newRow);
                newRow[field.key] = val;
            } else {
                // Apply defaults for unmapped fields
                if (field.key === 'ordered_by') {
                    newRow['ordered_by'] = defaultOrderedBy;
                } else if (field.key === 'order_date') {
                    newRow['order_date'] = defaultOrderDate;
                }
            }
        });

        // Handle force new order mode
        if (forceNew) {
            newRow.status = ORDER_STATUS.REQUESTED;
            newRow.is_received = false;
            newRow.received_date = null;
            delete newRow.id;
        } else if (!newRow.status) {
            newRow.status = ORDER_STATUS.REQUESTED;
        }

        return newRow;
    });

    // Filter out empty rows (rows missing all required fields)
    const validOrders = orders.filter((row: any) => {
        const requiredFields = DB_FIELDS.filter((f) => f.required);
        const hasAnyRequired = requiredFields.some((f) => !!row[f.key]);
        if (!hasAnyRequired) {
            skippedCount++;
        }
        return hasAnyRequired;
    });

    return {
        orders: validOrders,
        skippedCount,
    };
}

/**
 * Transform a single field value based on field type.
 */
function transformFieldValue(
    fieldKey: string,
    val: any,
    rowContext: any
): any {
    if (val === undefined || val === null || val === '') {
        return val;
    }

    switch (fieldKey) {
        case 'sku':
            return String(val).toUpperCase();

        case 'unit_price':
            return parseFloat(val) || 0;

        case 'quantity':
            return parseInt(val) || 1;

        case 'order_date':
        case 'received_date':
            return transformDateValue(val);

        case 'is_received':
            if (typeof val === 'string' && val.toLowerCase().includes('yes')) {
                rowContext.status = ORDER_STATUS.RECEIVED;
                return true;
            }
            return false;

        default:
            return val;
    }
}

/**
 * Transform date values from Excel format to ISO date string.
 */
function transformDateValue(val: any): string | null {
    if (typeof val === 'number') {
        // Excel serial date to JS Date
        // Excel uses days since 1900-01-01 (with a bug for 1900 leap year)
        const date = new Date((val - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }

    if (typeof val === 'string') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    }

    return null;
}
