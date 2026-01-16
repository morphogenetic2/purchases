<script lang="ts">
    import * as Table from "$lib/components/ui/table";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { ChevronLeft, ChevronRight, X, Layers } from "lucide-svelte";
    import { resizable } from "$lib/actions/resizable";
    import ColumnFilter from "$lib/components/ColumnFilter.svelte";
    import ColumnSelector from "$lib/components/ColumnSelector.svelte";
    import OrderRow from "$lib/components/OrderRow.svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import type {
        OrderState,
        GroupByOption,
    } from "$lib/state/orderState.svelte";
    import type { Order } from "$lib/types";

    import { getStatusColor } from "$lib/utils";
    import { supabase } from "$lib/supabaseClient";
    import { invalidateAll } from "$app/navigation";

    const groupByOptions: { value: GroupByOption; label: string }[] = [
        { value: "none", label: "No Grouping" },
        { value: "date", label: "Group by Date" },
        { value: "provider", label: "Group by Provider" },
        { value: "requester", label: "Group by Requester" },
        { value: "status", label: "Group by Status" },
    ];

    import { orderService } from "$lib/services/orderService";

    import { Checkbox } from "$lib/components/ui/checkbox";
    import FloatingActionBar from "$lib/components/FloatingActionBar.svelte";
    import { exportOrdersToExcel } from "$lib/utils/export";

    const groupColors = [
        "bg-emerald-950/20",
        "bg-blue-950/20",
        "bg-cyan-950/20",
        "bg-purple-950/20",
        "bg-amber-950/20",
        "bg-rose-950/20",
    ];

    let { state, onEdit, onReceive, onRevert } = $props<{
        state: OrderState;
        onEdit: (order: Order) => void;
        onReceive: (id: string) => void;
        onRevert: (id: string) => void;
    }>();

    async function handleCellUpdate(id: string, field: string, value: any) {
        const { error } = await orderService.updateOrder(id, {
            [field]: value,
        });

        if (error) {
            throw error;
        }
        await invalidateAll();
    }

    async function handleBulkReceive() {
        if (!confirm(`Mark ${state.selectedIds.size} orders as received?`))
            return;
        const ids = Array.from(state.selectedIds) as string[];
        await Promise.all(
            ids.map((id: string) =>
                orderService.updateOrder(id, {
                    status: "received",
                    received_date: new Date().toISOString().split("T")[0],
                    is_received: true,
                }),
            ),
        );
        state.clearSelection();
        await invalidateAll();
    }

    async function handleBulkDelete() {
        if (
            !confirm(
                `Delete ${state.selectedIds.size} orders? This cannot be undone.`,
            )
        )
            return;
        const ids = Array.from(state.selectedIds) as string[];
        await Promise.all(
            ids.map((id: string) => orderService.deleteOrder(id)),
        );
        state.clearSelection();
        await invalidateAll();
    }

    function handleBulkExport() {
        const selectedOrders = state.rawOrders.filter((o: Order) =>
            state.selectedIds.has(o.id),
        );
        exportOrdersToExcel(selectedOrders);
        state.clearSelection();
    }
</script>

<Card.Root class="bg-zinc-900 border-zinc-800">
    <Card.Header>
        <div class="flex items-center justify-between">
            <Card.Title>Orders</Card.Title>
            <div class="flex items-center gap-2">
                <div class="w-72 relative">
                    <Input
                        type="search"
                        placeholder="Search orders..."
                        bind:value={state.searchTerm}
                        class="bg-zinc-950 border-zinc-700 text-zinc-100 pr-8"
                    />
                    {#if state.searchTerm}
                        <button
                            type="button"
                            onclick={() => (state.searchTerm = "")}
                            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-sm hover:bg-zinc-800"
                            title="Clear search"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    {/if}
                </div>

                <!-- Group By Selector -->
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <Button
                            variant="outline"
                            size="sm"
                            class="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300 {state.groupBy !==
                            'none'
                                ? 'border-emerald-500/50 text-emerald-400'
                                : ''}"
                        >
                            <Layers class="h-4 w-4 mr-2" />
                            {state.groupBy === "none"
                                ? "Group"
                                : state.groupBy === "date"
                                  ? "By Date"
                                  : state.groupBy === "provider"
                                    ? "By Provider"
                                    : state.groupBy === "requester"
                                      ? "By Requester"
                                      : "By Status"}
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content class="bg-zinc-950 border-zinc-800">
                        {#each groupByOptions as option}
                            <DropdownMenu.Item
                                class="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer {state.groupBy ===
                                option.value
                                    ? 'text-emerald-400'
                                    : ''}"
                                onclick={() => state.setGroupBy(option.value)}
                            >
                                {option.label}
                                {#if state.groupBy === option.value}
                                    <span class="ml-auto text-emerald-500"
                                        >✓</span
                                    >
                                {/if}
                            </DropdownMenu.Item>
                        {/each}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

                <ColumnSelector {state} />
            </div>
        </div>
    </Card.Header>
    <Card.Content>
        <div class="rounded-md border border-zinc-800">
            <Table.Root class="table-fixed">
                <Table.Header>
                    <Table.Row class="border-zinc-800 hover:bg-transparent">
                        <Table.Head class="w-[40px] px-2 text-center">
                            <Checkbox
                                checked={state.paginatedOrders.length > 0 &&
                                    state.paginatedOrders.every((o: Order) =>
                                        state.selectedIds.has(o.id),
                                    )}
                                onCheckedChange={() =>
                                    state.toggleAll(
                                        state.paginatedOrders.map(
                                            (o: Order) => o.id,
                                        ),
                                    )}
                                class="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                        </Table.Head>
                        {#each state.visibleColumns as col (col.id)}
                            {#if col.id === "date_formatted"}
                                <th
                                    use:resizable
                                    class="h-12 px-2 text-left align-middle font-medium text-zinc-400 w-[100px] overflow-hidden"
                                >
                                    <div
                                        class="flex items-center gap-1 overflow-hidden"
                                    >
                                        <ColumnFilter
                                            title=""
                                            options={state.filterOptions.date}
                                            bind:selected={
                                                state.activeFilters.date
                                            }
                                        />
                                        <button
                                            onclick={() => state.toggleSort()}
                                            class="flex items-center gap-1 hover:text-white transition-colors font-medium truncate"
                                        >
                                            Date
                                            <span
                                                class="text-[10px] opacity-70 flex-shrink-0"
                                                >{state.sortDirection === "asc"
                                                    ? "↑"
                                                    : "↓"}</span
                                            >
                                        </button>
                                    </div>
                                </th>
                            {:else if col.id === "description"}
                                <th
                                    use:resizable
                                    class="h-12 px-2 text-left align-middle font-medium text-zinc-400 w-[300px] overflow-hidden text-ellipsis whitespace-nowrap"
                                    >Description</th
                                >
                            {:else if col.id === "provider"}
                                <th
                                    use:resizable
                                    class="h-12 px-2 text-left align-middle font-medium text-zinc-400 overflow-hidden"
                                >
                                    <ColumnFilter
                                        title="Provider"
                                        options={state.filterOptions.provider}
                                        bind:selected={
                                            state.activeFilters.provider
                                        }
                                    />
                                </th>
                            {:else if col.id === "price_formatted"}
                                <th
                                    use:resizable
                                    class="h-12 px-2 text-right align-middle font-medium text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >Price</th
                                >
                            {:else if col.id === "ordered_by"}
                                <th
                                    use:resizable
                                    class="h-12 px-2 text-left align-middle font-medium text-zinc-400 overflow-hidden"
                                >
                                    <ColumnFilter
                                        title="Requester"
                                        options={state.filterOptions.requester}
                                        bind:selected={
                                            state.activeFilters.requester
                                        }
                                    />
                                </th>
                            {:else if col.id === "status"}
                                <th
                                    use:resizable
                                    class="h-12 px-2 text-left align-middle font-medium text-zinc-400 overflow-hidden"
                                >
                                    <ColumnFilter
                                        title="Status"
                                        options={state.filterOptions.status}
                                        bind:selected={
                                            state.activeFilters.status
                                        }
                                    />
                                </th>
                            {:else if col.id === "actions"}
                                <th
                                    class="h-12 px-2 text-right align-middle font-medium text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >Actions</th
                                >
                            {:else if col.id === "quantity"}
                                <th
                                    use:resizable
                                    class="h-12 px-2 text-center align-middle font-medium text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >Qty</th
                                >
                            {:else}
                                <th
                                    use:resizable
                                    class="h-12 px-2 text-left align-middle font-medium text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >{col.label}</th
                                >
                            {/if}
                        {/each}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if state.filteredOrders.length === 0}
                        <Table.Row>
                            <Table.Cell
                                colspan={state.visibleColumns.length + 1}
                                class="h-24 text-center text-zinc-500"
                            >
                                No orders found.
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each state.groupedOrders as group, i (group.key)}
                            {@const rowColor =
                                state.groupBy !== "none"
                                    ? groupColors[i % groupColors.length]
                                    : ""}
                            <!-- Group Header -->
                            {#if state.groupBy !== "none"}
                                <Table.Row
                                    class="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800/50"
                                >
                                    <Table.Cell
                                        colspan={state.visibleColumns.length +
                                            1}
                                        class="py-2 px-4"
                                    >
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="font-semibold text-zinc-200"
                                            >
                                                {group.label}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                class="bg-zinc-700 text-zinc-300 text-xs"
                                            >
                                                {group.orders.length}
                                                {group.orders.length === 1
                                                    ? "order"
                                                    : "orders"}
                                            </Badge>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {/if}

                            {#each group.orders as order (order.id)}
                                <OrderRow
                                    rowClass={rowColor}
                                    isSelected={state.selectedIds.has(order.id)}
                                    onToggleSelect={() =>
                                        state.toggleSelection(order.id)}
                                    {order}
                                    visibleColumns={state.visibleColumns}
                                    {onEdit}
                                    {onReceive}
                                    {onRevert}
                                    onUpdate={handleCellUpdate}
                                />
                            {/each}
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </div>

        <!-- Pagination Footer -->
        {#if state.filteredOrders.length > 0}
            <div
                class="flex items-center justify-between px-4 py-3 border-t border-zinc-800"
            >
                <div class="text-sm text-zinc-500">
                    Showing {state.pageInfo.start} to {state.pageInfo.end} of {state
                        .pageInfo.total} orders
                </div>
                <div class="flex items-center gap-4">
                    <!-- Page Size Selector -->
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-zinc-500">Per page:</span>
                        <select
                            class="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={state.pageSize}
                            onchange={(e) =>
                                state.setPageSize(
                                    Number(e.currentTarget.value),
                                )}
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={250}>250</option>
                            <option value={500}>500</option>
                            <option value={1000}>1000</option>
                            <option value={10000}>All</option>
                        </select>
                    </div>

                    <!-- Page Navigation -->
                    <div class="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            class="h-8 w-8 p-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 disabled:opacity-50"
                            disabled={state.currentPage <= 1}
                            onclick={() => state.prevPage()}
                        >
                            <ChevronLeft class="h-4 w-4" />
                        </Button>
                        <span class="text-sm text-zinc-300 px-3">
                            Page {state.currentPage} of {state.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            class="h-8 w-8 p-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 disabled:opacity-50"
                            disabled={state.currentPage >= state.totalPages}
                            onclick={() => state.nextPage()}
                        >
                            <ChevronRight class="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        {/if}
    </Card.Content>
</Card.Root>

<FloatingActionBar
    count={state.selectedIds.size}
    onClear={() => state.clearSelection()}
    onReceive={handleBulkReceive}
    onDelete={handleBulkDelete}
    onExport={handleBulkExport}
/>
