<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Label } from "$lib/components/ui/label";
    import type { OrderState } from "$lib/state/orderState.svelte";
    import type { Order } from "$lib/types";

    let {
        open = $bindable(false),
        state: orderState,
        onExport,
    } = $props<{
        open: boolean;
        state: OrderState;
        onExport: (orders: Order[]) => Promise<void> | void;
    }>();

    type ExportMode =
        | "current_view"
        | "selected_rows"
        | "latest_date"
        | "requester"
        | "date"
        | "provider"
        | "status";
    type ExportSource = "filtered" | "all";

    let selectedMode = $state("current_view" as ExportMode);
    let sourceMode = $state("filtered" as ExportSource);
    let selectedRequester = $state("");
    let selectedDate = $state("");
    let selectedProvider = $state("");
    let selectedStatus = $state("");

    let baseOrders: Order[] = $derived.by(() =>
        sourceMode === "filtered" ? orderState.filteredOrders : orderState.rawOrders
    );

    let requesterOptions: string[] = $derived.by(() =>
        Array.from(
            new Set(
                baseOrders
                    .map((order: Order) => order.ordered_by)
                    .filter((value: string | undefined): value is string => !!value),
            ),
        ).sort()
    );
    let providerOptions: string[] = $derived.by(() =>
        Array.from(
            new Set(
                baseOrders
                    .map((order: Order) => order.provider)
                    .filter((value: string | undefined): value is string => !!value),
            ),
        ).sort()
    );
    let statusOptions: string[] = $derived.by(() =>
        Array.from(
            new Set(
                baseOrders
                    .map((order: Order) => order.status)
                    .filter((value: string | undefined): value is string => !!value),
            ),
        ).sort()
    );
    let dateOptions: string[] = $derived.by(() => {
        const dates = new Set<string>();
        baseOrders.forEach((order: Order) => {
            const d = new Date(order.order_date || order.created_at);
            if (!isNaN(d.getTime())) {
                dates.add(d.toISOString().split("T")[0]);
            }
        });
        return Array.from(dates).sort().reverse();
    });

    let latestDateForSource: string | null = $derived(
        dateOptions.length > 0 ? dateOptions[0] : null
    );
    let exportFilename: string = $derived(
        `orders_export_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    let usesSourceToggle: boolean = $derived(
        selectedMode === "latest_date" ||
            selectedMode === "requester" ||
            selectedMode === "date" ||
            selectedMode === "provider" ||
            selectedMode === "status"
    );

    let selectionComplete: boolean = $derived.by(() => {
        if (selectedMode === "requester") return selectedRequester.length > 0;
        if (selectedMode === "date") return selectedDate.length > 0;
        if (selectedMode === "provider") return selectedProvider.length > 0;
        if (selectedMode === "status") return selectedStatus.length > 0;
        if (selectedMode === "latest_date") return !!latestDateForSource;
        if (selectedMode === "selected_rows") return orderState.selectedIds.size > 0;
        return true;
    });

    let exportOrders = $derived.by((): Order[] => {
        if (selectedMode === "current_view") {
            return orderState.filteredOrders;
        }

        if (selectedMode === "selected_rows") {
            const selectedIds = Array.from(orderState.selectedIds);
            return orderState.rawOrders.filter((order: Order) =>
                selectedIds.includes(order.id)
            );
        }

        if (selectedMode === "latest_date") {
            if (!latestDateForSource) return [];
            return baseOrders.filter((order: Order) => {
                const d = order.order_date || order.created_at;
                return d && d.startsWith(latestDateForSource);
            });
        }

        if (selectedMode === "requester") {
            if (!selectedRequester) return [];
            return baseOrders.filter(
                (order: Order) => order.ordered_by === selectedRequester
            );
        }

        if (selectedMode === "date") {
            if (!selectedDate) return [];
            return baseOrders.filter((order: Order) => {
                const d = order.order_date || order.created_at;
                return d && d.startsWith(selectedDate);
            });
        }

        if (selectedMode === "provider") {
            if (!selectedProvider) return [];
            return baseOrders.filter(
                (order: Order) => order.provider === selectedProvider
            );
        }

        if (!selectedStatus) return [];
        return baseOrders.filter((order: Order) => order.status === selectedStatus);
    });

    let canExport: boolean = $derived(
        selectionComplete && exportOrders.length > 0
    );

    let selectionLabel: string = $derived.by(() => {
        if (selectedMode === "current_view") return "Current filtered rows";
        if (selectedMode === "selected_rows")
            return `Selected rows (${orderState.selectedIds.size})`;
        if (selectedMode === "latest_date")
            return latestDateForSource
                ? `Latest date (${new Date(latestDateForSource).toLocaleDateString()})`
                : "Latest date";
        if (selectedMode === "requester") return `Requester: ${selectedRequester || "-"}`;
        if (selectedMode === "date")
            return `Date: ${
                selectedDate
                    ? new Date(selectedDate).toLocaleDateString()
                    : "-"
            }`;
        if (selectedMode === "provider") return `Provider: ${selectedProvider || "-"}`;
        return `Status: ${selectedStatus || "-"}`;
    });

    async function handleExport() {
        if (!canExport) return;
        await onExport(exportOrders);
        open = false;
    }

    $effect(() => {
        if (open) {
            selectedMode = "current_view";
            sourceMode = "filtered";
            selectedRequester = "";
            selectedDate = "";
            selectedProvider = "";
            selectedStatus = "";
        }
    });

    $effect(() => {
        if (selectedMode === "current_view" || selectedMode === "selected_rows") {
            sourceMode = "filtered";
        }
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Content
        class="sm:max-w-[560px] bg-zinc-950 border-zinc-900 text-zinc-100"
    >
        <Dialog.Header>
            <Dialog.Title>Export Options</Dialog.Title>
            <Dialog.Description>
                Choose what to export, review the summary, then confirm.
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
            <div class="grid gap-2">
                <Label class="text-xs text-zinc-400">Dataset</Label>
                <select
                    bind:value={selectedMode}
                    class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="current_view">Current filtered rows</option>
                    {#if orderState.selectedIds.size > 0}
                        <option value="selected_rows">
                            Selected rows ({orderState.selectedIds.size})
                        </option>
                    {/if}
                    <option value="latest_date">Latest date</option>
                    <option value="requester">By requester</option>
                    <option value="date">By date</option>
                    <option value="provider">By provider</option>
                    <option value="status">By status</option>
                </select>
            </div>

            {#if selectedMode === "requester"}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">Requester</Label>
                    <select
                        bind:value={selectedRequester}
                        class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Select requester</option>
                        {#each requesterOptions as requester}
                            <option value={requester}>{requester}</option>
                        {/each}
                    </select>
                </div>
            {:else if selectedMode === "date"}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">Date</Label>
                    <select
                        bind:value={selectedDate}
                        class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Select date</option>
                        {#each dateOptions as d}
                            <option value={d}>{new Date(d).toLocaleDateString()}</option>
                        {/each}
                    </select>
                </div>
            {:else if selectedMode === "provider"}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">Provider</Label>
                    <select
                        bind:value={selectedProvider}
                        class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Select provider</option>
                        {#each providerOptions as provider}
                            <option value={provider}>{provider}</option>
                        {/each}
                    </select>
                </div>
            {:else if selectedMode === "status"}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">Status</Label>
                    <select
                        bind:value={selectedStatus}
                        class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Select status</option>
                        {#each statusOptions as status}
                            <option value={status}>{status}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            {#if usesSourceToggle}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">Source</Label>
                    <div class="flex gap-2">
                        <Button
                            variant={sourceMode === "filtered" ? "default" : "outline"}
                            type="button"
                            onclick={() => (sourceMode = "filtered")}
                            class={sourceMode === "filtered"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"}
                        >
                            Current filtered view
                        </Button>
                        <Button
                            variant={sourceMode === "all" ? "default" : "outline"}
                            type="button"
                            onclick={() => (sourceMode = "all")}
                            class={sourceMode === "all"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"}
                        >
                            All orders
                        </Button>
                    </div>
                </div>
            {/if}

            <div class="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 space-y-1">
                <p class="text-xs uppercase tracking-wide text-zinc-500">Export Summary</p>
                <p class="text-sm text-zinc-200">
                    Selection: <span class="text-zinc-100">{selectionLabel}</span>
                </p>
                <p class="text-sm text-zinc-200">
                    Rows: <span class="text-zinc-100">{exportOrders.length}</span>
                </p>
                <p class="text-sm text-zinc-200">
                    File: <span class="text-zinc-100">{exportFilename}</span>
                </p>
                {#if !selectionComplete}
                    <p class="text-xs text-amber-400">
                        Complete the selection above to enable export.
                    </p>
                {:else if exportOrders.length === 0}
                    <p class="text-xs text-amber-400">
                        No rows match this selection.
                    </p>
                {/if}
            </div>
        </div>
        <Dialog.Footer>
            <Button
                variant="outline"
                type="button"
                onclick={() => (open = false)}
                class="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
                Cancel
            </Button>
            <Button
                type="button"
                onclick={handleExport}
                disabled={!canExport}
                class="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                Export
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
