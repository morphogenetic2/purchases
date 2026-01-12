<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { supabase } from "$lib/supabaseClient";
    import ExcelIngestor from "$lib/components/ExcelIngestor.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import * as Table from "$lib/components/ui/table";
    import { Input } from "$lib/components/ui/input";
    import * as Card from "$lib/components/ui/card";
    import { resizable } from "$lib/actions/resizable";

    import ColumnFilter from "$lib/components/ColumnFilter.svelte";
    import OrderDialog from "$lib/components/OrderDialog.svelte";
    import { Plus, Pencil } from "lucide-svelte";

    let { data } = $props();
    let searchTerm = $state("");
    let sortDirection = $state("asc"); // asc = older-to-newer (default)

    let activeFilters = $state({
        requester: [] as string[],
        status: [] as string[],
        date: [] as string[],
    });

    let filterOptions = $derived.by(() => {
        const orders = data.orders || [];
        const requesters = new Set<string>();
        const statuses = new Set<string>();
        const dates = new Set<string>();

        orders.forEach((o: any) => {
            if (o.ordered_by) requesters.add(o.ordered_by);
            if (o.status) statuses.add(o.status);

            const d = new Date(o.order_date || o.created_at);
            if (!isNaN(d.getTime())) dates.add(d.toLocaleDateString());
        });

        return {
            requester: Array.from(requesters).sort(),
            status: Array.from(statuses).sort(),
            date: Array.from(dates).sort(
                (a, b) => new Date(a).getTime() - new Date(b).getTime(),
            ),
        };
    });

    function toggleSort() {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    }

    let filteredOrders = $derived(
        (data.orders || [])
            .filter((order: any) => {
                // 1. Text Search
                const search = searchTerm.toLowerCase();
                const matchesSearch =
                    order.description?.toLowerCase().includes(search) ||
                    order.provider?.toLowerCase().includes(search) ||
                    order.ordered_by?.toLowerCase().includes(search) ||
                    order.sku?.toLowerCase().includes(search) ||
                    order.project_code?.toLowerCase().includes(search);
                if (!matchesSearch) return false;

                // 2. Column Filters
                if (
                    activeFilters.requester.length > 0 &&
                    !activeFilters.requester.includes(order.ordered_by)
                )
                    return false;
                if (
                    activeFilters.status.length > 0 &&
                    !activeFilters.status.includes(order.status)
                )
                    return false;

                if (activeFilters.date.length > 0) {
                    const d = new Date(
                        order.order_date || order.created_at,
                    ).toLocaleDateString();
                    if (!activeFilters.date.includes(d)) return false;
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

                const diff = sortDirection === "asc" ? t1 - t2 : t2 - t1;

                if (diff !== 0) return diff;
                return (a.id || "").localeCompare(b.id || ""); // Deterministic tie-breaker
            }),
    );

    async function quickReceive(id: string) {
        const { error } = await supabase
            .from("orders")
            .update({
                status: "received",
                received_date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
                is_received: true,
            })
            .eq("id", id);

        if (error) {
            alert("Error updating order: " + error.message);
        } else {
            invalidateAll();
        }
    }

    function getStatusColor(status: string) {
        switch (status?.toLowerCase()) {
            case "received":
                return "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/20";
            case "ordered":
                return "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 border-blue-500/20";
            case "cancelled":
                return "bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20";
            default:
                return "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/20"; // requested
        }
    }

    let isSheetOpen = $state(false);
    let editingOrder = $state(null);

    function handleAdd() {
        editingOrder = null;
        isSheetOpen = true;
    }

    function handleEdit(order: any) {
        editingOrder = order;
        isSheetOpen = true;
    }

    let uniqueProviders = $derived.by(() => {
        const orders = data.orders || [];
        const providers = new Set<string>();
        orders.forEach((o: any) => {
            if (o.provider) providers.add(o.provider);
        });
        return Array.from(providers).sort();
    });
</script>

<div class="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8">
    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 class="text-3xl font-bold tracking-tight text-white mb-2">
                MiMe orders
            </h1>
            <p class="text-zinc-400">Manage orders</p>
        </div>
        <div class="flex items-center gap-2">
            <Button
                variant="destructive"
                size="sm"
                onclick={async () => {
                    if (
                        confirm(
                            "DANGER: This will delete ALL orders. Are you sure?",
                        )
                    ) {
                        const { error } = await supabase
                            .from("orders")
                            .delete()
                            .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
                        if (error) alert("Error: " + error.message);
                        else {
                            alert("Database wiped.");
                            window.location.reload();
                        }
                    }
                }}
            >
                Wipe DB
            </Button>
            <ExcelIngestor />
            <Button
                onclick={handleAdd}
                class="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                <Plus class="mr-2 h-4 w-4" /> New Order
            </Button>
        </div>
    </div>

    <Card.Root class="bg-zinc-900 border-zinc-800">
        <Card.Header>
            <div class="flex items-center justify-between">
                <Card.Title>Orders</Card.Title>
                <div class="w-72">
                    <Input
                        type="search"
                        placeholder="Search orders..."
                        bind:value={searchTerm}
                        class="bg-zinc-950 border-zinc-700 text-zinc-100"
                    />
                </div>
            </div>
        </Card.Header>
        <Card.Content>
            <div class="rounded-md border border-zinc-800">
                <Table.Root>
                    <Table.Header>
                        <Table.Row class="border-zinc-800 hover:bg-zinc-900">
                            <th
                                use:resizable
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400 w-[100px]"
                            >
                                <div class="flex items-center gap-2">
                                    <button
                                        onclick={toggleSort}
                                        class="flex items-center gap-1 hover:text-white transition-colors font-medium"
                                    >
                                        Date
                                        <span class="text-[10px] opacity-70"
                                            >{sortDirection === "asc"
                                                ? "↑"
                                                : "↓"}</span
                                        >
                                    </button>
                                    <ColumnFilter
                                        title=""
                                        options={filterOptions.date}
                                        bind:selected={activeFilters.date}
                                    />
                                </div>
                            </th>
                            <th
                                use:resizable
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400 w-[300px] max-w-[400px]"
                                >Description</th
                            >
                            <th
                                use:resizable
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
                                >Provider</th
                            >
                            <th
                                use:resizable
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
                            >
                                <ColumnFilter
                                    title="Requester"
                                    options={filterOptions.requester}
                                    bind:selected={activeFilters.requester}
                                />
                            </th>
                            <th
                                use:resizable
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
                                >Project</th
                            >
                            <th
                                use:resizable
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
                                >PO Num</th
                            >
                            <th
                                use:resizable
                                class="h-12 px-4 text-center align-middle font-medium text-zinc-400"
                                >Qty</th
                            >
                            <th
                                use:resizable
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
                                >Received</th
                            >
                            <th
                                use:resizable
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
                                >Location</th
                            >
                            <th
                                class="h-12 px-4 text-left align-middle font-medium text-zinc-400"
                            >
                                <ColumnFilter
                                    title="Status"
                                    options={filterOptions.status}
                                    bind:selected={activeFilters.status}
                                />
                            </th>
                            <th
                                class="h-12 px-4 text-right align-middle font-medium text-zinc-400"
                                >Actions</th
                            >
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if filteredOrders.length === 0}
                            <Table.Row>
                                <Table.Cell
                                    colspan={8}
                                    class="h-24 text-center text-zinc-500"
                                >
                                    No orders found.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each filteredOrders as order (order.id)}
                                <Table.Row
                                    class="border-zinc-800 hover:bg-zinc-900/50"
                                >
                                    <Table.Cell class="font-mono text-zinc-300">
                                        {new Date(
                                            order.order_date ||
                                                order.created_at,
                                        ).toLocaleDateString()}
                                    </Table.Cell>
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
                                    <Table.Cell class="text-zinc-300 text-sm"
                                        >{order.provider}</Table.Cell
                                    >
                                    <Table.Cell class="text-zinc-300 text-sm"
                                        >{order.ordered_by}</Table.Cell
                                    >
                                    <Table.Cell
                                        class="text-zinc-400 font-mono text-xs"
                                        >{order.project_code || "-"}</Table.Cell
                                    >
                                    <Table.Cell
                                        class="text-zinc-400 font-mono text-xs"
                                        >{order.po_number || "-"}</Table.Cell
                                    >
                                    <Table.Cell
                                        class="text-center text-zinc-300"
                                        >{order.quantity}</Table.Cell
                                    >
                                    <Table.Cell class="text-zinc-400 text-sm">
                                        {#if order.received_date}
                                            {new Date(
                                                order.received_date,
                                            ).toLocaleDateString()}
                                        {:else}
                                            <span class="text-zinc-600">-</span>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell class="text-zinc-200 text-sm">
                                        {order.storage_location || "-"}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                            variant="outline"
                                            class="{getStatusColor(
                                                order.status,
                                            )} border whitespace-nowrap"
                                        >
                                            {order.status}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        {#if order.status !== "received" && order.status !== "cancelled"}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onclick={() =>
                                                    quickReceive(order.id)}
                                                class="h-7 text-xs border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                                            >
                                                Receive
                                            </Button>
                                        {/if}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            class="h-7 w-7 p-0 ml-1 text-zinc-400 hover:text-white"
                                            onclick={() => handleEdit(order)}
                                        >
                                            <Pencil class="h-3.5 w-3.5" />
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>
        </Card.Content>
    </Card.Root>
</div>

<OrderDialog
    bind:isOpen={isSheetOpen}
    order={editingOrder}
    providers={uniqueProviders}
    onSave={() => invalidateAll()}
/>
