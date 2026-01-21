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

export interface Column {
    id: keyof Order | "actions" | "price_formatted" | "date_formatted"; // Extended keys for display
    label: string;
    visible: boolean;
}

export interface RealtimeEventPayload<T = Order> {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T | null;
    old: Partial<T> | null;
    schema: string;
    table: string;
    commit_timestamp: string;
    errors: null | any[];
}
