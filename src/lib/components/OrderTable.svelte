<script lang="ts">
    import * as Table from "$lib/components/ui/table";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Pencil, Loader2, X } from "lucide-svelte";
    import { resizable } from "$lib/actions/resizable";
    import { formatDate } from "$lib/utils";
    import ColumnFilter from "$lib/components/ColumnFilter.svelte";
    import ColumnSelector from "$lib/components/ColumnSelector.svelte";
    import EditableCell from "$lib/components/EditableCell.svelte";
    import type { OrderState } from "$lib/state/orderState.svelte";
    import type { Order } from "$lib/types";

    let {
        state,
        onEdit,
        onReceive,
        onRevert,
        loadingOrderId = null,
    } = $props<{
        state: OrderState;
        onEdit: (order: Order) => void;
        onReceive: (id: string) => void;
        onRevert: (id: string) => void;
        loadingOrderId?: string | null;
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
                        {#each state.filteredOrders as order (order.id)}
                            <Table.Row
                                class="border-zinc-800 hover:bg-zinc-800/30"
                            >
                                {#each state.visibleColumns as col (col.id)}
                                    {#if col.id === "date_formatted"}
                                        <Table.Cell
                                            class="font-mono text-zinc-300"
                                        >
                                            {formatDate(
                                                order.order_date ||
                                                    order.created_at,
                                            )}
                                        </Table.Cell>
                                    {:else if col.id === "description"}
                                        <Table.Cell class="max-w-[300px]">
                                            <div
                                                class="font-medium text-zinc-200 truncate"
                                                title={order.description}
                                            >
                                                {order.description}
                                            </div>
                                            <div
                                                class="text-xs text-zinc-500 font-mono mt-0.5"
                                            >
                                                {order.sku || ""}
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
                                            {order.ordered_by}
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
                                                type="number"
                                            />
                                        </Table.Cell>
                                    {:else if col.id === "received_date"}
                                        <Table.Cell
                                            class="text-zinc-400 text-sm"
                                        >
                                            {#if order.received_date}
                                                {formatDate(
                                                    order.received_date,
                                                )}
                                            {:else}
                                                <span class="text-zinc-600"
                                                    >-</span
                                                >
                                            {/if}
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
                                                    disabled={loadingOrderId ===
                                                        order.id}
                                                    class="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent disabled:opacity-50"
                                                >
                                                    {#if loadingOrderId === order.id}
                                                        <Loader2
                                                            class="h-3 w-3 animate-spin mr-1"
                                                        />
                                                    {/if}
                                                    Receive
                                                </Button>
                                            {/if}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                class="h-7 w-7 p-0 ml-1 text-zinc-400 hover:text-white"
                                                onclick={() => onEdit(order)}
                                            >
                                                <Pencil class="h-3.5 w-3.5" />
                                            </Button>
                                        </Table.Cell>
                                    {/if}
                                {/each}
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </div>
    </Card.Content>
</Card.Root>
