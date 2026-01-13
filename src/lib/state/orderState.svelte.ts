import type { Order, Column } from "$lib/types";
import { formatDateForFilter, formatDate } from "$lib/utils";

export type GroupByOption = 'none' | 'date' | 'provider';
export interface OrderGroup {
    key: string;
    label: string;
    orders: Order[];
}

const STORAGE_KEY = 'order-table-columns';

const DEFAULT_COLUMNS: Column[] = [
    { id: "date_formatted", label: "Date", visible: true },
    { id: "description", label: "Description", visible: true },
    { id: "provider", label: "Provider", visible: true },
    { id: "price_formatted", label: "Price", visible: true },
    { id: "ordered_by", label: "Requester", visible: true },
    { id: "project_code", label: "Project", visible: true },
    { id: "po_number", label: "PO Num", visible: true },
    { id: "quantity", label: "Qty", visible: true },
    { id: "received_date", label: "Received", visible: true },
    { id: "storage_location", label: "Location", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "actions", label: "Actions", visible: true },
];

function loadColumnsFromStorage(): Column[] {
    if (typeof window === 'undefined') return DEFAULT_COLUMNS;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULT_COLUMNS;

        const parsed = JSON.parse(stored) as Column[];

        // Merge with defaults to handle any new columns added in code updates
        const storedIds = new Set(parsed.map(c => c.id));
        const mergedColumns = [...parsed];

        // Add any new columns from defaults that aren't in storage
        DEFAULT_COLUMNS.forEach(defaultCol => {
            if (!storedIds.has(defaultCol.id)) {
                mergedColumns.push(defaultCol);
            }
        });

        return mergedColumns;
    } catch {
        return DEFAULT_COLUMNS;
    }
}

function saveColumnsToStorage(columns: Column[]): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {
        // Ignore storage errors (e.g., quota exceeded)
    }
}

export class OrderState {
    rawOrders = $state<Order[]>([]);
    searchTerm = $state("");
    sortDirection = $state("desc");
    groupBy = $state<GroupByOption>('none');

    columns = $state<Column[]>(loadColumnsFromStorage());

    activeFilters = $state({
        requester: [] as string[],
        status: [] as string[],
        date: [] as string[],
        provider: [] as string[],
    });

    constructor(orders: Order[] = []) {
        this.rawOrders = orders;
    }

    visibleColumns = $derived(this.columns.filter(c => c.visible));

    updateColumns(newColumns: Column[]) {
        this.columns = newColumns;
        saveColumnsToStorage(newColumns);
    }

    resetColumns() {
        this.columns = [...DEFAULT_COLUMNS];
        saveColumnsToStorage(DEFAULT_COLUMNS);
    }


    setOrders(orders: Order[]) {
        this.rawOrders = orders;
    }

    toggleSort() {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    }

    setGroupBy(option: GroupByOption) {
        this.groupBy = option;
    }

    filterOptions = $derived.by(() => {
        const orders = this.rawOrders;
        const requesters = new Set<string>();
        const statuses = new Set<string>();
        const dates = new Set<string>();
        const providers = new Set<string>();

        orders.forEach((o) => {
            if (o.ordered_by) requesters.add(o.ordered_by);
            if (o.status) statuses.add(o.status);
            if (o.provider) providers.add(o.provider);

            const d = new Date(o.order_date || o.created_at);
            if (!isNaN(d.getTime())) dates.add(formatDateForFilter(d));
        });

        return {
            requester: Array.from(requesters).sort(),
            status: Array.from(statuses).sort(),
            provider: Array.from(providers).sort(),
            date: Array.from(dates).sort(
                (a, b) => new Date(b).getTime() - new Date(a).getTime(),
            ),
        };
    });

    filteredOrders = $derived.by(() => {
        return (this.rawOrders || [])
            .filter((order) => {
                // 1. Text Search
                const search = this.searchTerm.toLowerCase();
                const matchesSearch =
                    order.description?.toLowerCase().includes(search) ||
                    order.provider?.toLowerCase().includes(search) ||
                    order.ordered_by?.toLowerCase().includes(search) ||
                    order.sku?.toLowerCase().includes(search) ||
                    order.project_code?.toLowerCase().includes(search);
                if (!matchesSearch) return false;

                // 2. Column Filters
                if (
                    this.activeFilters.requester.length > 0 &&
                    !this.activeFilters.requester.includes(order.ordered_by)
                )
                    return false;
                if (
                    this.activeFilters.status.length > 0 &&
                    !this.activeFilters.status.includes(order.status)
                )
                    return false;

                if (
                    this.activeFilters.provider.length > 0 &&
                    !this.activeFilters.provider.includes(order.provider)
                )
                    return false;

                if (this.activeFilters.date.length > 0) {
                    const d = formatDateForFilter(new Date(
                        order.order_date || order.created_at,
                    ));
                    if (!this.activeFilters.date.includes(d)) return false;
                }

                return true;
            })
            .sort((a, b) => {
                // Use order_date if available (from excel), else created_at
                const t1 = new Date(
                    a.order_date || a.created_at || 0,
                ).getTime();
                const t2 = new Date(
                    b.order_date || b.created_at || 0,
                ).getTime();

                const diff = this.sortDirection === "asc" ? t1 - t2 : t2 - t1;

                if (diff !== 0) return diff;
                return (a.id || "").localeCompare(b.id || ""); // Deterministic tie-breaker
            });
    });

    uniqueProviders = $derived.by(() => {
        const providers = new Set<string>();
        this.rawOrders.forEach((o) => {
            if (o.provider) providers.add(o.provider);
        });
        return Array.from(providers).sort();
    });

    groupedOrders = $derived.by((): OrderGroup[] => {
        const orders = this.filteredOrders;

        if (this.groupBy === 'none') {
            return [{ key: 'all', label: '', orders }];
        }

        const groups = new Map<string, Order[]>();

        orders.forEach(order => {
            let key: string;
            let label: string;

            if (this.groupBy === 'date') {
                const dateStr = formatDate(order.order_date || order.created_at);
                key = dateStr;
                label = dateStr;
            } else {
                // provider
                key = order.provider || 'Unknown';
                label = order.provider || 'Unknown Provider';
            }

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(order);
        });

        // Convert to array and sort groups
        const result: OrderGroup[] = [];
        groups.forEach((groupOrders, key) => {
            result.push({
                key,
                label: key,
                orders: groupOrders
            });
        });

        // Sort groups
        if (this.groupBy === 'date') {
            // For dates, sort by the first order's date in each group
            result.sort((a, b) => {
                const dateA = new Date(a.orders[0]?.order_date || a.orders[0]?.created_at || 0).getTime();
                const dateB = new Date(b.orders[0]?.order_date || b.orders[0]?.created_at || 0).getTime();
                return this.sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
            });
        } else {
            // For provider, sort alphabetically
            result.sort((a, b) => a.label.localeCompare(b.label));
        }

        return result;
    });
}
