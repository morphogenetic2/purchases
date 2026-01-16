/**
 * Field definitions for Excel import mapping.
 * Centralizes the schema for Excel → Order transformation.
 */

export interface FieldDefinition {
    key: string;
    label: string;
    required?: boolean;
}

export const DB_FIELDS: FieldDefinition[] = [
    { key: 'order_date', label: 'Order Date' },
    { key: 'ordered_by', label: 'Ordered By', required: true },
    { key: 'provider', label: 'Provider', required: true },
    { key: 'sku', label: 'SKU' },
    { key: 'description', label: 'Description', required: true },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unit_price', label: 'Unit Price' },
    { key: 'project_code', label: 'Project Code' },
    { key: 'po_number', label: 'PO Number' },
    { key: 'received_date', label: 'Received Date' },
    { key: 'storage_location', label: 'Storage Location' },
    { key: 'is_received', label: 'Received?' },
];

export const REQUIRED_FIELDS = DB_FIELDS.filter(f => f.required);
