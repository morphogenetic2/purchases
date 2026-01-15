<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { Label } from "$lib/components/ui/label";
    import type { OrderState } from "$lib/state/orderState.svelte";
    import type { Order } from "$lib/types";

    let {
        open = $bindable(false),
        state,
        onExport,
    } = $props<{
        open: boolean;
        state: OrderState;
        onExport: (orders: Order[]) => void;
    }>();

    let latestDate = $derived(
        state.filterOptions.date.length > 0
            ? state.filterOptions.date[0]
            : null,
    );

    function handleCurrentView() {
        onExport(state.filteredOrders);
        open = false;
    }

    function handleLatest() {
        if (!latestDate) return;
        triggerExport("date", latestDate);
    }

    function triggerExport(
        type: "requester" | "date" | "provider" | "status",
        value: string,
    ) {
        if (!value) return;
        let orders: Order[] = [];

        if (type === "requester") {
            orders = state.rawOrders.filter(
                (o: Order) => o.ordered_by === value,
            );
        } else if (type === "date") {
            orders = state.rawOrders.filter((o: Order) => {
                const d = o.order_date || o.created_at;
                return d && d.startsWith(value);
            });
        } else if (type === "provider") {
            orders = state.rawOrders.filter((o: Order) => o.provider === value);
        } else if (type === "status") {
            orders = state.rawOrders.filter((o: Order) => o.status === value);
        }
        onExport(orders);
        // Dialog closing is handled via onExport if needed, but here we close it explicitly
        open = false;
    }

    function toItems(arr: string[]) {
        return arr.map((v) => ({ value: v, label: v }));
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content
        class="sm:max-w-[425px] bg-zinc-950 border-zinc-900 text-zinc-100"
    >
        <Dialog.Header>
            <Dialog.Title>Export Options</Dialog.Title>
            <Dialog.Description>
                Select a dataset to export to Excel.
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
            <!-- Option 1: Current View -->
            <Button
                variant="outline"
                onclick={handleCurrentView}
                class="justify-start h-auto py-3 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white"
            >
                <div class="flex flex-col items-start text-left">
                    <span class="font-medium">Visible columns (all)</span>
                    <span class="text-xs text-zinc-500"
                        >Exports currently filtered view ({state.filteredOrders
                            .length} orders)</span
                    >
                </div>
            </Button>

            <!-- Option 2: Latest Order -->
            {#if latestDate}
                <Button
                    variant="outline"
                    onclick={handleLatest}
                    class="justify-start h-auto py-3 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                >
                    <div class="flex flex-col items-start text-left">
                        <span class="font-medium">Latest orders</span>
                        <span class="text-xs text-zinc-500"
                            >Exports orders from {new Date(
                                latestDate,
                            ).toLocaleDateString()}</span
                        >
                    </div>
                </Button>
            {/if}

            <div class="border-t border-zinc-900 my-2"></div>
            <p
                class="text-xs text-zinc-500 font-medium uppercase tracking-wider"
            >
                Group Export
            </p>

            <!-- Requester -->
            <div class="space-y-2">
                <Label class="text-xs text-zinc-400">By Requester</Label>
                <Select.Root
                    type="single"
                    onValueChange={(v) =>
                        typeof v === "string" && triggerExport("requester", v)}
                >
                    <Select.Trigger
                        class="bg-zinc-900 border-zinc-800 text-zinc-300 w-full"
                    >
                        <span class="truncate">Select a requester</span>
                    </Select.Trigger>
                    <Select.Content
                        class="bg-zinc-900 border-zinc-800 text-zinc-300 max-h-[200px] overflow-y-auto"
                    >
                        {#each toItems(state.filterOptions.requester) as item}
                            <Select.Item
                                value={item.value}
                                label={item.label}
                                class="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                                >{item.label}</Select.Item
                            >
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <!-- Date -->
            <div class="space-y-2">
                <Label class="text-xs text-zinc-400">By Date</Label>
                <Select.Root
                    type="single"
                    onValueChange={(v) =>
                        typeof v === "string" && triggerExport("date", v)}
                >
                    <Select.Trigger
                        class="bg-zinc-900 border-zinc-800 text-zinc-300 w-full"
                    >
                        <span class="truncate">Select a date</span>
                    </Select.Trigger>
                    <Select.Content
                        class="bg-zinc-900 border-zinc-800 text-zinc-300 max-h-[200px] overflow-y-auto"
                    >
                        {#each toItems(state.filterOptions.date) as item}
                            <Select.Item
                                value={item.value}
                                label={item.label}
                                class="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                            >
                                {new Date(item.value).toLocaleDateString()}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <!-- Provider -->
            <div class="space-y-2">
                <Label class="text-xs text-zinc-400">By Provider</Label>
                <Select.Root
                    type="single"
                    onValueChange={(v) =>
                        typeof v === "string" && triggerExport("provider", v)}
                >
                    <Select.Trigger
                        class="bg-zinc-900 border-zinc-800 text-zinc-300 w-full"
                    >
                        <span class="truncate">Select a provider</span>
                    </Select.Trigger>
                    <Select.Content
                        class="bg-zinc-900 border-zinc-800 text-zinc-300 max-h-[200px] overflow-y-auto"
                    >
                        {#each toItems(state.filterOptions.provider) as item}
                            <Select.Item
                                value={item.value}
                                label={item.label}
                                class="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                                >{item.label}</Select.Item
                            >
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <!-- Status -->
            <div class="space-y-2">
                <Label class="text-xs text-zinc-400">By Status</Label>
                <Select.Root
                    type="single"
                    onValueChange={(v) =>
                        typeof v === "string" && triggerExport("status", v)}
                >
                    <Select.Trigger
                        class="bg-zinc-900 border-zinc-800 text-zinc-300 w-full"
                    >
                        <span class="truncate">Select a status</span>
                    </Select.Trigger>
                    <Select.Content
                        class="bg-zinc-900 border-zinc-800 text-zinc-300 max-h-[200px] overflow-y-auto"
                    >
                        {#each toItems(state.filterOptions.status) as item}
                            <Select.Item
                                value={item.value}
                                label={item.label}
                                class="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                                >{item.label}</Select.Item
                            >
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
