import type { Order } from "$lib/types";

export class OrderState {
    rawOrders = $state<Order[]>([]);
    searchTerm = $state("");
    sortDirection = $state("desc"); // desc = newer-to-older (default)
    activeFilters = $state({
        requester: [] as string[],
        status: [] as string[],
        date: [] as string[],
    });

    constructor(orders: Order[] = []) {
        this.rawOrders = orders;
    }

    setOrders(orders: Order[]) {
        this.rawOrders = orders;
    }

    toggleSort() {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    }

    filterOptions = $derived.by(() => {
        const orders = this.rawOrders;
        const requesters = new Set<string>();
        const statuses = new Set<string>();
        const dates = new Set<string>();

        orders.forEach((o) => {
            if (o.ordered_by) requesters.add(o.ordered_by);
            if (o.status) statuses.add(o.status);

            const d = new Date(o.order_date || o.created_at);
            if (!isNaN(d.getTime())) dates.add(d.toLocaleDateString());
        });

        return {
            requester: Array.from(requesters).sort(),
            status: Array.from(statuses).sort(),
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

    uniqueProviders = $derived.by(() => {
        const providers = new Set<string>();
        this.rawOrders.forEach((o) => {
            if (o.provider) providers.add(o.provider);
        });
        return Array.from(providers).sort();
    });
}
