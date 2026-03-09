import type { Order, Column, RealtimeEventPayload } from "$lib/types";
import { SvelteSet } from "svelte/reactivity";
import {
    ORDER_STATUS,
    GROUP_BY_OPTIONS,
    PAGINATION,
    type GroupByOption
} from "$lib/constants";

export type { GroupByOption };

export interface OrderGroup {
    key: string;
    label: string;
    orders: Order[];
}

export interface ActiveFilters {
    requester: string[];
    status: string[];
    date: string[];
    provider: string[];
}

export interface FilterPresetConfig {
    searchTerm: string;
    activeFilters: ActiveFilters;
    groupBy: GroupByOption;
}

export interface SavedFilterPreset {
    id: string;
    name: string;
    config: FilterPresetConfig;
}

export type BuiltInPresetId =
    | "requested_this_week"
    | "pending_by_requester";

const TABLE_PREFERENCES_KEY = "orders.tablePreferences.v1";

interface TablePreferences {
    columns?: Array<{ id: string; visible: boolean }>;
    activeFilters?: {
        requester?: string[];
        status?: string[];
        date?: string[];
        provider?: string[];
    };
    pageSize?: number;
    groupBy?: GroupByOption;
    customPresets?: SavedFilterPreset[];
}

export class OrderState {
    rawOrders = $state<Order[]>([]);
    searchTerm = $state("");
    sortDirection = $state("desc");
    groupBy = $state<GroupByOption>(GROUP_BY_OPTIONS.DATE);
    selectedIds = new SvelteSet<string>();
    isLoading = $state(false);
    isProcessing = $state(false);

    // Pagination
    currentPage = $state(1);
    pageSize = $state<number>(PAGINATION.DEFAULT_PAGE_SIZE);
    customPresets = $state<SavedFilterPreset[]>([]);

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

    activeFilters = $state<ActiveFilters>({
        requester: [] as string[],
        status: [] as string[],
        date: [] as string[],
        provider: [] as string[],
    });

    constructor(orders: Order[] = []) {
        this.rawOrders = orders;
        this.loadPreferences();
    }

    visibleColumns = $derived(this.columns.filter(c => c.visible));

    updateColumns(newColumns: Column[]) {
        this.columns = newColumns;
    }


    setOrders(orders: Order[]) {
        this.rawOrders = orders;
    }

    // --- Realtime ---
    // --- Realtime ---
    // --- Realtime ---
    handleRealtimeEvent(payload: RealtimeEventPayload<Order>) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        console.log(`Realtime Event [${eventType}] received:`, payload);

        if (eventType === 'INSERT') {
            if (newRecord && !this.rawOrders.find(o => o.id === newRecord.id)) {
                this.rawOrders.push(newRecord as Order);
            }
        } else if (eventType === 'UPDATE') {
            const index = this.rawOrders.findIndex(o => o.id === newRecord?.id);
            if (index !== -1 && newRecord) {
                // Svelte 5 deep reactivity handles object mutation
                Object.assign(this.rawOrders[index], newRecord);
            }
        } else if (eventType === 'DELETE') {
            const index = this.rawOrders.findIndex(o => o.id === oldRecord?.id);
            if (index !== -1) {
                this.rawOrders.splice(index, 1);
            }
            if (oldRecord?.id && this.selectedIds.has(oldRecord.id)) {
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

    private buildCurrentPresetConfig(): FilterPresetConfig {
        return {
            searchTerm: this.searchTerm,
            activeFilters: {
                requester: [...this.activeFilters.requester],
                status: [...this.activeFilters.status],
                date: [...this.activeFilters.date],
                provider: [...this.activeFilters.provider],
            },
            groupBy: this.groupBy,
        };
    }

    private applyPresetConfig(config: FilterPresetConfig) {
        this.searchTerm = config.searchTerm;
        this.activeFilters = {
            requester: [...config.activeFilters.requester],
            status: [...config.activeFilters.status],
            date: [...config.activeFilters.date],
            provider: [...config.activeFilters.provider],
        };
        this.groupBy = config.groupBy;
        this.currentPage = 1;
    }

    resetFilters() {
        this.applyPresetConfig({
            searchTerm: "",
            activeFilters: {
                requester: [],
                status: [],
                date: [],
                provider: [],
            },
            groupBy: GROUP_BY_OPTIONS.DATE,
        });
    }

    applyBuiltInPreset(presetId: BuiltInPresetId) {
        if (presetId === "requested_this_week") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const day = (today.getDay() + 6) % 7; // Monday = 0
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - day);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const weekDates = this.filterOptions.date.filter((dateStr) => {
                const d = new Date(`${dateStr}T00:00:00`);
                return !isNaN(d.getTime()) && d >= weekStart && d <= weekEnd;
            });

            this.applyPresetConfig({
                searchTerm: "",
                activeFilters: {
                    requester: [],
                    status: [ORDER_STATUS.REQUESTED],
                    date: weekDates,
                    provider: [],
                },
                groupBy: GROUP_BY_OPTIONS.DATE,
            });
            return;
        }

        this.applyPresetConfig({
            searchTerm: "",
            activeFilters: {
                requester: [],
                status: [
                    ORDER_STATUS.REQUESTED,
                    ORDER_STATUS.ORDERED,
                    ORDER_STATUS.PARTIALLY_RECEIVED,
                ],
                date: [],
                provider: [],
            },
            groupBy: GROUP_BY_OPTIONS.REQUESTER,
        });
    }

    applySavedPreset(id: string): boolean {
        const preset = this.customPresets.find((item) => item.id === id);
        if (!preset) return false;

        this.applyPresetConfig(preset.config);
        return true;
    }

    saveCurrentPreset(name: string): "created" | "updated" {
        const trimmed = name.trim();
        if (!trimmed) {
            throw new Error("Preset name is required");
        }

        const config = this.buildCurrentPresetConfig();
        const existingIndex = this.customPresets.findIndex(
            (preset) => preset.name.toLowerCase() === trimmed.toLowerCase(),
        );

        if (existingIndex !== -1) {
            const existing = this.customPresets[existingIndex];
            this.customPresets[existingIndex] = {
                ...existing,
                name: trimmed,
                config,
            };
            this.savePreferences();
            return "updated";
        }

        const id = typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        this.customPresets = [
            ...this.customPresets,
            {
                id,
                name: trimmed,
                config,
            },
        ];
        this.savePreferences();
        return "created";
    }

    loadPreferences() {
        if (typeof window === "undefined") return;

        try {
            const raw = window.localStorage.getItem(TABLE_PREFERENCES_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw) as TablePreferences;
            if (!parsed || typeof parsed !== "object") return;

            if (Array.isArray(parsed.columns)) {
                const visibilityById = new Map(
                    parsed.columns
                        .filter((column) =>
                            column &&
                            typeof column.id === "string" &&
                            typeof column.visible === "boolean")
                        .map((column) => [column.id, column.visible]),
                );

                this.columns = this.columns.map((column) =>
                    visibilityById.has(column.id)
                        ? { ...column, visible: visibilityById.get(column.id)! }
                        : column,
                );
            }

            if (parsed.activeFilters && typeof parsed.activeFilters === "object") {
                this.activeFilters = {
                    requester: Array.isArray(parsed.activeFilters.requester)
                        ? parsed.activeFilters.requester.filter((v): v is string =>
                            typeof v === "string")
                        : [],
                    status: Array.isArray(parsed.activeFilters.status)
                        ? parsed.activeFilters.status.filter((v): v is string =>
                            typeof v === "string")
                        : [],
                    date: Array.isArray(parsed.activeFilters.date)
                        ? parsed.activeFilters.date.filter((v): v is string =>
                            typeof v === "string")
                        : [],
                    provider: Array.isArray(parsed.activeFilters.provider)
                        ? parsed.activeFilters.provider.filter((v): v is string =>
                            typeof v === "string")
                        : [],
                };
            }

            if (
                typeof parsed.pageSize === "number" &&
                Number.isFinite(parsed.pageSize) &&
                parsed.pageSize > 0
            ) {
                this.pageSize = parsed.pageSize;
            }

            const validGroupBy = Object.values(GROUP_BY_OPTIONS).includes(
                parsed.groupBy as GroupByOption,
            );
            if (validGroupBy) {
                this.groupBy = parsed.groupBy as GroupByOption;
            }

            if (Array.isArray(parsed.customPresets)) {
                this.customPresets = parsed.customPresets.filter((preset) =>
                    preset &&
                    typeof preset.id === "string" &&
                    typeof preset.name === "string" &&
                    preset.config &&
                    typeof preset.config.searchTerm === "string" &&
                    preset.config.activeFilters &&
                    Array.isArray(preset.config.activeFilters.requester) &&
                    Array.isArray(preset.config.activeFilters.status) &&
                    Array.isArray(preset.config.activeFilters.date) &&
                    Array.isArray(preset.config.activeFilters.provider) &&
                    Object.values(GROUP_BY_OPTIONS).includes(
                        preset.config.groupBy as GroupByOption,
                    ))
                    .map((preset) => ({
                        id: preset.id,
                        name: preset.name,
                        config: {
                            searchTerm: preset.config.searchTerm,
                            activeFilters: {
                                requester:
                                    preset.config.activeFilters.requester
                                        .filter((value): value is string =>
                                            typeof value === "string"),
                                status:
                                    preset.config.activeFilters.status
                                        .filter((value): value is string =>
                                            typeof value === "string"),
                                date:
                                    preset.config.activeFilters.date
                                        .filter((value): value is string =>
                                            typeof value === "string"),
                                provider:
                                    preset.config.activeFilters.provider
                                        .filter((value): value is string =>
                                            typeof value === "string"),
                            },
                            groupBy: preset.config.groupBy as GroupByOption,
                        },
                    }));
            }
        } catch (error) {
            console.warn("Failed to load table preferences:", error);
        }
    }

    savePreferences() {
        if (typeof window === "undefined") return;

        const payload: TablePreferences = {
            columns: this.columns.map((column) => ({
                id: column.id,
                visible: column.visible,
            })),
            activeFilters: {
                requester: [...this.activeFilters.requester],
                status: [...this.activeFilters.status],
                date: [...this.activeFilters.date],
                provider: [...this.activeFilters.provider],
            },
            pageSize: this.pageSize,
            groupBy: this.groupBy,
            customPresets: this.customPresets.map((preset) => ({
                id: preset.id,
                name: preset.name,
                config: {
                    searchTerm: preset.config.searchTerm,
                    activeFilters: {
                        requester: [...preset.config.activeFilters.requester],
                        status: [...preset.config.activeFilters.status],
                        date: [...preset.config.activeFilters.date],
                        provider: [...preset.config.activeFilters.provider],
                    },
                    groupBy: preset.config.groupBy,
                },
            })),
        };

        try {
            window.localStorage.setItem(
                TABLE_PREFERENCES_KEY,
                JSON.stringify(payload),
            );
        } catch (error) {
            console.warn("Failed to save table preferences:", error);
        }
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
                    order.project_code?.toLowerCase().includes(search) ||
                    order.po_number?.toLowerCase().includes(search) ||
                    order.storage_location?.toLowerCase().includes(search) ||
                    order.status?.toLowerCase().includes(search) ||
                    order.quantity?.toString().includes(search) ||
                    order.unit_price?.toString().includes(search);
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
                    const d = new Date(order.order_date || order.created_at);
                    const dateStr = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
                    if (!this.activeFilters.date.includes(dateStr)) return false;
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
                    const d = new Date(order.order_date || order.created_at);
                    const dateStr = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "Unknown";
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
