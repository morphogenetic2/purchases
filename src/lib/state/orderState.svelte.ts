import type { Order, Column } from "$lib/types";
import { SvelteSet } from "svelte/reactivity";

export type GroupByOption = 'none' | 'date' | 'provider' | 'requester' | 'status';

export interface OrderGroup {
    key: string;
    label: string;
    orders: Order[];
}

export class OrderState {
    rawOrders = $state<Order[]>([]);
    searchTerm = $state("");
    sortDirection = $state("desc");
    groupBy = $state<GroupByOption>('none');
    selectedIds = new SvelteSet<string>();

    // Pagination
    currentPage = $state(1);
    pageSize = $state(50);

    columns = $state<Column[]>([
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
    ]);

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
    }


    setOrders(orders: Order[]) {
        this.rawOrders = orders;
    }

    // --- Realtime ---
    handleRealtimeEvent(payload: any) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (eventType === 'INSERT') {
            if (!this.rawOrders.find(o => o.id === newRecord.id)) {
                this.rawOrders.push(newRecord as Order);
            }
        } else if (eventType === 'UPDATE') {
            const index = this.rawOrders.findIndex(o => o.id === newRecord.id);
            if (index !== -1) {
                // Svelte 5 deep reactivity handles object mutation
                Object.assign(this.rawOrders[index], newRecord);
            }
        } else if (eventType === 'DELETE') {
            const index = this.rawOrders.findIndex(o => o.id === oldRecord.id);
            if (index !== -1) {
                this.rawOrders.splice(index, 1);
            }
            if (this.selectedIds.has(oldRecord.id)) {
                this.selectedIds.delete(oldRecord.id);
            }
        }
    }

    // --- Selection ---
    toggleSelection(id: string) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
    }

    toggleAll(ids: string[]) {
        if (ids.every(id => this.selectedIds.has(id))) {
            ids.forEach(id => this.selectedIds.delete(id));
        } else {
            ids.forEach(id => this.selectedIds.add(id));
        }
    }

    clearSelection() {
        this.selectedIds.clear();
    }

    toggleSort() {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    }

    setGroupBy(option: GroupByOption) {
        this.groupBy = option;
        this.currentPage = 1;
    }

    // Pagination methods
    setPage(page: number) {
        const maxPage = Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
        this.currentPage = Math.min(Math.max(1, page), maxPage);
    }

    nextPage() {
        this.setPage(this.currentPage + 1);
    }

    prevPage() {
        this.setPage(this.currentPage - 1);
    }

    setPageSize(size: number) {
        this.pageSize = size;
        this.currentPage = 1; // Reset to first page when changing page size
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

            if (o.order_date || o.created_at) {
                const d = new Date(o.order_date || o.created_at);
                if (!isNaN(d.getTime())) {
                    dates.add(d.toISOString().split("T")[0]);
                }
            }
        });

        return {
            requester: Array.from(requesters).sort(),
            status: Array.from(statuses).sort(),
            provider: Array.from(providers).sort(),
            date: Array.from(dates).sort().reverse(),
        };
    });

    filteredOrders = $derived.by(() => {
        // Reset to page 1 when filters change is handled by the effect below
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
                    const d = new Date(
                        order.order_date || order.created_at,
                    ).toLocaleDateString();
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

    // Pagination derived properties
    totalPages = $derived(Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize)));

    paginatedOrders = $derived.by(() => {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.filteredOrders.slice(start, end);
    });

    // Page info for display
    pageInfo = $derived.by(() => {
        const total = this.filteredOrders.length;
        const start = total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, total);
        return { start, end, total };
    });



    // Grouping
    groupedOrders = $derived.by((): OrderGroup[] => {
        const orders = this.paginatedOrders;

        if (this.groupBy === 'none') {
            return [{ key: 'all', label: '', orders }];
        }

        const groups = new Map<string, Order[]>();

        orders.forEach(order => {
            let key: string;
            let label: string;

            switch (this.groupBy) {
                case 'date': {
                    const dateStr = new Date(order.order_date || order.created_at).toLocaleDateString();
                    key = dateStr;
                    label = dateStr;
                    break;
                }
                case 'provider': {
                    key = order.provider || 'Unknown';
                    label = order.provider || 'Unknown Provider';
                    break;
                }
                case 'requester': {
                    key = order.ordered_by || 'Unknown';
                    label = order.ordered_by || 'Unknown Requester';
                    break;
                }
                case 'status': {
                    key = order.status || 'unknown';
                    label = (order.status || 'Unknown').charAt(0).toUpperCase() + (order.status || 'unknown').slice(1);
                    break;
                }
                default:
                    key = 'other';
                    label = 'Other';
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
            result.sort((a, b) => {
                const dateA = new Date(a.orders[0]?.order_date || a.orders[0]?.created_at || 0).getTime();
                const dateB = new Date(b.orders[0]?.order_date || b.orders[0]?.created_at || 0).getTime();
                return this.sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
            });
        } else {
            result.sort((a, b) => a.label.localeCompare(b.label));
        }

        return result;
    });
}
