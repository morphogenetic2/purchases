<script lang="ts">
    import * as Table from "$lib/components/ui/table";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import {
        Pencil,
        ChevronLeft,
        ChevronRight,
        X,
        Layers,
    } from "lucide-svelte";
    import { resizable } from "$lib/actions/resizable";
    import ColumnFilter from "$lib/components/ColumnFilter.svelte";
    import ColumnSelector from "$lib/components/ColumnSelector.svelte";
    import EditableCell from "$lib/components/EditableCell.svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import type {
        OrderState,
        GroupByOption,
    } from "$lib/state/orderState.svelte";
    import type { Order } from "$lib/types";

    const groupByOptions: { value: GroupByOption; label: string }[] = [
        { value: "none", label: "No Grouping" },
        { value: "date", label: "Group by Date" },
        { value: "provider", label: "Group by Provider" },
        { value: "requester", label: "Group by Requester" },
        { value: "status", label: "Group by Status" },
    ];

    let { state, onEdit, onReceive, onRevert } = $props<{
        state: OrderState;
        onEdit: (order: Order) => void;
        onReceive: (id: string) => void;
        onRevert: (id: string) => void;
    }>();

    function getStatusColor(status: string) {
        switch (status?.toLowerCase()) {
            case "received":
                return "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/20";
            case "cancelled":
                return "bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20";
            case "requested":
            default:
                // requested (and legacy ordered)
                return "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/20";
        }
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
            <Table.Root>
                <Table.Header>
                    <Table.Row class="border-zinc-800 hover:bg-transparent">
                        {#each state.visibleColumns as col (col.id)}
                            {#if col.id === "date_formatted"}
                                <th
                                    use:resizable
                                    class="h-12 px-4 text-left align-middle font-medium text-zinc-400 w-[100px]"
                                >
                                    <div class="flex items-center gap-2">
                                        <button
                                            onclick={() => state.toggleSort()}
                                            class="flex items-center gap-1 hover:text-white transition-colors font-medium"
                                        >
                                            Date
                                            <span class="text-[10px] opacity-70"
                                                >{state.sortDirection === "asc"
                                                    ? "↑"
                                                    : "↓"}</span
                                            >
                                        </button>
                                        <ColumnFilter
                                            title=""
                                            options={state.filterOptions.date}
                                            bind:selected={
                                                state.activeFilters.date
                                            }
                                        />
                                    </div>
                                </th>
                            {:else if col.id === "description"}
                                <th
                                    use:resizable
                                    class="h-12 px-4 text-left align-middle font-medium text-zinc-400 w-[300px] max-w-[400px]"
                                    >Description</th
                                >
                            {:else if col.id === "provider"}
                                <th
                                    use:resizable
                                    class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
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
                                    class="h-12 px-4 text-right align-middle font-medium text-zinc-400"
                                    >Price</th
                                >
                            {:else if col.id === "ordered_by"}
                                <th
                                    use:resizable
                                    class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
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
                                    class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
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
                                    class="h-12 px-4 text-right align-middle font-medium text-zinc-400"
                                    >Actions</th
                                >
                            {:else if col.id === "quantity"}
                                <th
                                    use:resizable
                                    class="h-12 px-4 text-center align-middle font-medium text-zinc-400"
                                    >Qty</th
                                >
                            {:else}
                                <th
                                    use:resizable
                                    class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
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
                                colspan={state.visibleColumns.length}
                                class="h-24 text-center text-zinc-500"
                            >
                                No orders found.
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each state.groupedOrders as group (group.key)}
                            <!-- Group Header -->
                            {#if state.groupBy !== "none"}
                                <Table.Row
                                    class="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800/50"
                                >
                                    <Table.Cell
                                        colspan={state.visibleColumns.length}
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
                                <Table.Row
                                    class="border-zinc-800 hover:bg-zinc-800/30"
                                >
                                    {#each state.visibleColumns as col (col.id)}
                                        {#if col.id === "date_formatted"}
                                            <Table.Cell
                                                class="font-mono text-zinc-300"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="order_date"
                                                    value={order.order_date ||
                                                        order.created_at}
                                                    type="date"
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "description"}
                                            <Table.Cell
                                                class="max-w-[300px] overflow-hidden"
                                            >
                                                <div
                                                    class="font-medium text-zinc-200 truncate"
                                                >
                                                    <EditableCell
                                                        orderId={order.id}
                                                        field="description"
                                                        value={order.description}
                                                        class="truncate block max-w-[280px]"
                                                    />
                                                </div>
                                                <div
                                                    class="text-xs text-zinc-500 font-mono mt-0.5"
                                                >
                                                    <EditableCell
                                                        orderId={order.id}
                                                        field="sku"
                                                        value={order.sku}
                                                        class="text-xs"
                                                    />
                                                </div>
                                            </Table.Cell>
                                        {:else if col.id === "provider"}
                                            <Table.Cell
                                                class="text-zinc-300 text-sm"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="provider"
                                                    value={order.provider}
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "price_formatted"}
                                            <Table.Cell
                                                class="text-zinc-300 text-sm text-right font-mono"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="unit_price"
                                                    value={order.unit_price}
                                                    type="number"
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "ordered_by"}
                                            <Table.Cell
                                                class="text-zinc-300 text-sm"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="ordered_by"
                                                    value={order.ordered_by}
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "project_code"}
                                            <Table.Cell
                                                class="text-zinc-400 font-mono text-xs"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="project_code"
                                                    value={order.project_code}
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "po_number"}
                                            <Table.Cell
                                                class="text-zinc-400 font-mono text-xs"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="po_number"
                                                    value={order.po_number}
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "quantity"}
                                            <Table.Cell
                                                class="text-center text-zinc-300"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="quantity"
                                                    value={order.quantity}
                                                    type="integer"
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "received_date"}
                                            <Table.Cell
                                                class="text-zinc-400 text-sm"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="received_date"
                                                    value={order.received_date}
                                                    type="date"
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "storage_location"}
                                            <Table.Cell
                                                class="text-zinc-200 text-sm"
                                            >
                                                <EditableCell
                                                    orderId={order.id}
                                                    field="storage_location"
                                                    value={order.storage_location}
                                                />
                                            </Table.Cell>
                                        {:else if col.id === "status"}
                                            <Table.Cell>
                                                <Badge
                                                    variant="outline"
                                                    class="{getStatusColor(
                                                        order.status,
                                                    )} border whitespace-nowrap {order.status ===
                                                    'received'
                                                        ? 'cursor-pointer hover:opacity-80'
                                                        : ''}"
                                                    onclick={() =>
                                                        order.status ===
                                                            "received" &&
                                                        onRevert(order.id)}
                                                >
                                                    {order.status}
                                                </Badge>
                                            </Table.Cell>
                                        {:else if col.id === "actions"}
                                            <Table.Cell class="text-right">
                                                {#if order.status !== "received" && order.status !== "cancelled"}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onclick={() =>
                                                            onReceive(order.id)}
                                                        class="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                                    >
                                                        Receive
                                                    </Button>
                                                {/if}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    class="h-7 w-7 p-0 ml-1 text-zinc-400 hover:text-white"
                                                    onclick={() =>
                                                        onEdit(order)}
                                                >
                                                    <Pencil
                                                        class="h-3.5 w-3.5"
                                                    />
                                                </Button>
                                            </Table.Cell>
                                        {/if}
                                    {/each}
                                </Table.Row>
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
