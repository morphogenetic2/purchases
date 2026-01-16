/**
 * Order validation utilities.
 * Validates orders before database insertion.
 */

import { DB_FIELDS, REQUIRED_FIELDS } from './fieldDefinitions';

export interface ValidationError {
    index: number;
    description: string;
    missingFields: string[];
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * Validate an array of orders for required fields.
 * Returns validation result with details about any errors.
 */
export function validateOrders(orders: any[]): ValidationResult {
    const errors: ValidationError[] = [];

    orders.forEach((order, index) => {
        const missingFields: string[] = [];

        REQUIRED_FIELDS.forEach((field) => {
            if (!order[field.key]) {
                missingFields.push(field.label);
            }
        });

        if (missingFields.length > 0) {
            errors.push({
                index,
                description: order.description || 'Unknown',
                missingFields,
            });
        }
    });

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Format validation errors into a user-friendly message.
 */
export function formatValidationErrors(result: ValidationResult): string {
    if (result.valid) {
        return '';
    }

    if (result.errors.length === 1) {
        const error = result.errors[0];
        return `Error in Order "${error.description}": Missing required fields: ${error.missingFields.join(', ')}.`;
    }

    const errorMessages = result.errors.map(
        (e) => `• "${e.description}": Missing ${e.missingFields.join(', ')}`
    );

    return `${result.errors.length} orders have validation errors:\n${errorMessages.join('\n')}`;
}
