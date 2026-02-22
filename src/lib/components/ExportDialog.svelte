<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Label } from "$lib/components/ui/label";
    import type { OrderState } from "$lib/state/orderState.svelte";
    import type { Order } from "$lib/types";
    import { localizeStatus, t } from "$lib/i18n";

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
        if (selectedMode === "current_view") return $t("export.current_view");
        if (selectedMode === "selected_rows")
            return $t("export.selected_rows", { count: orderState.selectedIds.size });
        if (selectedMode === "latest_date")
            return latestDateForSource
                ? `${$t("export.latest_date")} (${new Date(latestDateForSource).toLocaleDateString()})`
                : $t("export.latest_date");
        if (selectedMode === "requester") {
            return `${$t("export.requester")}: ${selectedRequester || "-"}`;
        }
        if (selectedMode === "date")
            return `${$t("export.date")}: ${
                selectedDate
                    ? new Date(selectedDate).toLocaleDateString()
                    : "-"
            }`;
        if (selectedMode === "provider") return `${$t("export.provider")}: ${selectedProvider || "-"}`;
        return `${$t("export.status")}: ${selectedStatus ? localizeStatus(selectedStatus, $t) : "-"}`;
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
            <Dialog.Title>{$t("export.title")}</Dialog.Title>
            <Dialog.Description>
                {$t("export.description")}
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
            <div class="grid gap-2">
                <Label class="text-xs text-zinc-400">{$t("export.dataset")}</Label>
                <select
                    bind:value={selectedMode}
                    class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="current_view">{$t("export.current_view")}</option>
                    {#if orderState.selectedIds.size > 0}
                        <option value="selected_rows">
                            {$t("export.selected_rows", { count: orderState.selectedIds.size })}
                        </option>
                    {/if}
                    <option value="latest_date">{$t("export.latest_date")}</option>
                    <option value="requester">{$t("export.by_requester")}</option>
                    <option value="date">{$t("export.by_date")}</option>
                    <option value="provider">{$t("export.by_provider")}</option>
                    <option value="status">{$t("export.by_status")}</option>
                </select>
            </div>

            {#if selectedMode === "requester"}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">{$t("export.requester")}</Label>
                    <select
                        bind:value={selectedRequester}
                        class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">{$t("export.select_requester")}</option>
                        {#each requesterOptions as requester}
                            <option value={requester}>{requester}</option>
                        {/each}
                    </select>
                </div>
            {:else if selectedMode === "date"}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">{$t("export.date")}</Label>
                    <select
                        bind:value={selectedDate}
                        class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">{$t("export.select_date")}</option>
                        {#each dateOptions as d}
                            <option value={d}>{new Date(d).toLocaleDateString()}</option>
                        {/each}
                    </select>
                </div>
            {:else if selectedMode === "provider"}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">{$t("export.provider")}</Label>
                    <select
                        bind:value={selectedProvider}
                        class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">{$t("export.select_provider")}</option>
                        {#each providerOptions as provider}
                            <option value={provider}>{provider}</option>
                        {/each}
                    </select>
                </div>
            {:else if selectedMode === "status"}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">{$t("export.status")}</Label>
                    <select
                        bind:value={selectedStatus}
                        class="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">{$t("export.select_status")}</option>
                        {#each statusOptions as status}
                            <option value={status}>{localizeStatus(status, $t)}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            {#if usesSourceToggle}
                <div class="grid gap-2">
                    <Label class="text-xs text-zinc-400">{$t("export.source")}</Label>
                    <div class="flex gap-2">
                        <Button
                            variant={sourceMode === "filtered" ? "default" : "outline"}
                            type="button"
                            onclick={() => (sourceMode = "filtered")}
                            class={sourceMode === "filtered"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"}
                        >
                            {$t("export.source_filtered")}
                        </Button>
                        <Button
                            variant={sourceMode === "all" ? "default" : "outline"}
                            type="button"
                            onclick={() => (sourceMode = "all")}
                            class={sourceMode === "all"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"}
                        >
                            {$t("export.source_all")}
                        </Button>
                    </div>
                </div>
            {/if}

            <div class="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 space-y-1">
                <p class="text-xs uppercase tracking-wide text-zinc-500">{$t("export.summary")}</p>
                <p class="text-sm text-zinc-200">
                    {$t("export.selection")}: <span class="text-zinc-100">{selectionLabel}</span>
                </p>
                <p class="text-sm text-zinc-200">
                    {$t("export.rows")}: <span class="text-zinc-100">{exportOrders.length}</span>
                </p>
                <p class="text-sm text-zinc-200">
                    {$t("export.file")}: <span class="text-zinc-100">{exportFilename}</span>
                </p>
                {#if !selectionComplete}
                    <p class="text-xs text-amber-400">
                        {$t("export.complete_selection")}
                    </p>
                {:else if exportOrders.length === 0}
                    <p class="text-xs text-amber-400">
                        {$t("export.no_rows")}
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
                {$t("common.cancel")}
            </Button>
            <Button
                type="button"
                onclick={handleExport}
                disabled={!canExport}
                class="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                {$t("common.export")}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
