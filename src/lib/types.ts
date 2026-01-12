export interface Order {
    id: string;
    created_at: string;
    order_date?: string;
    description: string;
    sku?: string;
    provider: string;
    ordered_by: string;
    project_code?: string;
    po_number?: string;
    quantity: number;
    unit_price?: number;
    status: string;
    received_date?: string;
    storage_location?: string;
    is_received?: boolean;
}
