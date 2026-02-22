<script lang="ts">
    import * as Table from "$lib/components/ui/table";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { Button, buttonVariants } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { X, Layers, Bookmark } from "lucide-svelte";
    import { resizable } from "$lib/actions/resizable";
    import ColumnFilter from "$lib/components/ColumnFilter.svelte";
    import ColumnSelector from "$lib/components/ColumnSelector.svelte";
    import OrderRow from "$lib/components/OrderRow.svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import type { OrderState } from "$lib/state/orderState.svelte";
    import type { Order } from "$lib/types";
    import { GROUP_BY_OPTIONS } from "$lib/constants";
    import { localizeGroupBy, localizeStatus, t } from "$lib/i18n";

    // Build groupByOptions from constants
    const groupByOptions = Object.values(
        GROUP_BY_OPTIONS,
    ) as Array<(typeof GROUP_BY_OPTIONS)[keyof typeof GROUP_BY_OPTIONS]>;

    import { orderService } from "$lib/services/orderService";

    import { Checkbox } from "$lib/components/ui/checkbox";
    import FloatingActionBar from "$lib/components/FloatingActionBar.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { exportOrdersToExcel } from "$lib/utils/export";
    import { addToast } from "$lib/state/toastState";
    import PaginationControls from "$lib/components/PaginationControls.svelte";

    const groupColors = [
        "bg-emerald-950/20",
        "bg-blue-950/20",
        "bg-cyan-950/20",
        "bg-purple-950/20",
        "bg-amber-950/20",
        "bg-rose-950/20",
    ];

    let { state: orderState, onEdit, onReceive, onBulkReceive, onRevert } = $props<{
        state: OrderState;
        onEdit: (order: Order) => void;
        onReceive: (id: string) => void;
        onBulkReceive: (ids: string[]) => void;
        onRevert: (id: string) => void;
    }>();

    const columnLabelKeyById: Record<string, string> = {
        date_formatted: "column.date_formatted",
        description: "column.description",
        provider: "column.provider",
        price_formatted: "column.price_formatted",
        ordered_by: "column.ordered_by",
        project_code: "column.project_code",
        po_number: "column.po_number",
        quantity: "column.quantity",
        received_date: "column.received_date",
        storage_location: "column.storage_location",
        status: "column.status",
        actions: "column.actions",
    };

    function columnLabel(id: string, fallback: string): string {
        const key = columnLabelKeyById[id];
        return key ? $t(key) : fallback;
    }

    function groupByButtonLabel(): string {
        if (orderState.groupBy === GROUP_BY_OPTIONS.NONE) {
            return $t("table.group");
        }
        if (orderState.groupBy === GROUP_BY_OPTIONS.DATE) {
            return $t("table.group.by_date");
        }
        if (orderState.groupBy === GROUP_BY_OPTIONS.PROVIDER) {
            return $t("table.group.by_provider");
        }
        if (orderState.groupBy === GROUP_BY_OPTIONS.REQUESTER) {
            return $t("table.group.by_requester");
        }
        return $t("table.group.by_status");
    }

    function renderGroupLabel(group: { key: string; label: string }): string {
        if (orderState.groupBy === GROUP_BY_OPTIONS.STATUS) {
            return localizeStatus(group.key, $t);
        }
        return group.label || group.key;
    }

    async function handleCellUpdate(id: string, field: string, value: any) {
        const order = orderState.rawOrders.find((o: Order) => o.id === id);
        if (!order) return;

        const previousValue = (order as any)[field];
        (order as any)[field] = value;

        const { data, error } = await orderService.updateOrder(id, {
            [field]: value,
        });

        if (error) {
            (order as any)[field] = previousValue;
            throw error;
        }

        if (data && typeof data === "object") {
            Object.assign(order, data);
        }
    }

    let isBulkDeleteConfirmOpen = $state(false);

    function handleBulkDelete() {
        if (orderState.selectedIds.size === 0) return;
        isBulkDeleteConfirmOpen = true;
    }

    async function confirmBulkDelete() {
        if (orderState.selectedIds.size === 0) return true;

        const ids = Array.from(orderState.selectedIds) as string[];
        const removedOrders: Array<{ order: Order; index: number }> = orderState.rawOrders
            .map((order: Order, index: number) => ({ order, index }))
            .filter(({ order }: { order: Order }) => ids.includes(order.id));

        orderState.rawOrders = orderState.rawOrders.filter((order: Order) =>
            !ids.includes(order.id)
        );
        orderState.clearSelection();

        const { error } = await orderService.bulkDelete(ids);

        if (error) {
            const restored = [...orderState.rawOrders];
            removedOrders
                .sort(
                    (a: { index: number }, b: { index: number }) =>
                        a.index - b.index,
                )
                .forEach(({ order, index }: { order: Order; index: number }) => {
                    const insertionIndex = Math.min(index, restored.length);
                    restored.splice(insertionIndex, 0, order);
                });
            orderState.rawOrders = restored;
            ids.forEach((id) => orderState.selectedIds.add(id));
            addToast($t("table.toast.delete_error", { error: error.message }), "error");
            return false;
        }

        addToast(
            ids.length === 1
                ? $t("table.toast.delete_success_singular", { count: ids.length })
                : $t("table.toast.delete_success_plural", { count: ids.length }),
            "success",
        );
        return true;
    }

    function handleBulkExport() {
        const selectedOrders = orderState.rawOrders.filter((o: Order) =>
            orderState.selectedIds.has(o.id),
        );
        void exportOrdersToExcel(selectedOrders);
        orderState.clearSelection();
    }

    let isSavePresetDialogOpen = $state(false);
    let presetName = $state("");

    function applyBuiltInPreset(
        presetId: "requested_this_week" | "pending_by_requester",
    ) {
        orderState.applyBuiltInPreset(presetId);
        addToast($t("table.toast.preset_applied"), "success");
    }

    function applySavedPreset(id: string) {
        const found = orderState.applySavedPreset(id);
        if (found) {
            addToast($t("table.toast.preset_applied"), "success");
            return;
        }
        addToast($t("table.toast.preset_not_found"), "error");
    }

    function openSavePresetDialog() {
        presetName = "";
        isSavePresetDialogOpen = true;
    }

    function savePreset() {
        const trimmed = presetName.trim();
        if (!trimmed) {
            addToast($t("table.toast.preset_name_required"), "error");
            return;
        }

        try {
            const mode = orderState.saveCurrentPreset(trimmed);
            addToast(
                mode === "updated"
                    ? $t("table.toast.preset_updated")
                    : $t("table.toast.preset_saved"),
                "success",
            );
            isSavePresetDialogOpen = false;
        } catch (error: unknown) {
            const message = error instanceof Error
                ? error.message
                : $t("table.toast.preset_save_failed");
            addToast(message, "error");
        }
    }
</script>

<Card.Root class="bg-zinc-900 border-zinc-800">
    <Card.Header>
        <div class="flex items-center justify-between">
            <Card.Title>{$t("table.title")}</Card.Title>
            <div class="flex items-center gap-2">
                <div class="w-72 relative">
                    <Input
                        type="search"
                        placeholder={$t("table.search_placeholder")}
                        bind:value={orderState.searchTerm}
                        class="bg-zinc-950 border-zinc-700 text-zinc-100 pr-8"
                    />
                    {#if orderState.searchTerm}
                        <button
                            type="button"
                            onclick={() => (orderState.searchTerm = "")}
                            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-sm hover:bg-zinc-800"
                            title={$t("table.clear_search")}
                        >
                            <X class="h-4 w-4" />
                        </button>
                    {/if}
                </div>

                <!-- Group By Selector -->
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        class={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            class: `bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300 ${
                                orderState.groupBy !== "none"
                                    ? "border-emerald-500/50 text-emerald-400"
                                    : ""
                            }`,
                        })}
                    >
                        <Layers class="h-4 w-4 mr-2" />
                        {groupByButtonLabel()}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content class="bg-zinc-950 border-zinc-800">
                        {#each groupByOptions as option}
                            <DropdownMenu.Item
                                class="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer {orderState.groupBy ===
                                option
                                    ? 'text-emerald-400'
                                    : ''}"
                                onclick={() => orderState.setGroupBy(option)}
                            >
                                {localizeGroupBy(option, $t)}
                                {#if orderState.groupBy === option}
                                    <span class="ml-auto text-emerald-500"
                                        >✓</span
                                    >
                                {/if}
                            </DropdownMenu.Item>
                        {/each}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        class={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            class: "bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300",
                        })}
                    >
                        <Bookmark class="h-4 w-4 mr-2" />
                        {$t("table.presets")}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content class="bg-zinc-950 border-zinc-800 min-w-[240px]">
                        <DropdownMenu.Label class="text-zinc-500 text-xs uppercase tracking-wide">
                            {$t("table.quick_presets")}
                        </DropdownMenu.Label>
                        <DropdownMenu.Item
                            class="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer"
                            onclick={() =>
                                applyBuiltInPreset("requested_this_week")}
                        >
                            {$t("table.requested_this_week")}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            class="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer"
                            onclick={() =>
                                applyBuiltInPreset("pending_by_requester")}
                        >
                            {$t("table.pending_by_requester")}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            class="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer"
                            onclick={() => {
                                orderState.resetFilters();
                                addToast($t("table.toast.filters_reset"), "info");
                            }}
                        >
                            {$t("table.reset_filters")}
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator class="bg-zinc-800" />
                        <DropdownMenu.Label class="text-zinc-500 text-xs uppercase tracking-wide">
                            {$t("table.saved_presets")}
                        </DropdownMenu.Label>

                        {#if orderState.customPresets.length === 0}
                            <DropdownMenu.Item
                                disabled
                                class="text-zinc-500"
                            >
                                {$t("table.no_saved_presets")}
                            </DropdownMenu.Item>
                        {:else}
                            {#each orderState.customPresets as preset (preset.id)}
                                <DropdownMenu.Item
                                    class="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer"
                                    onclick={() => applySavedPreset(preset.id)}
                                >
                                    {preset.name}
                                </DropdownMenu.Item>
                            {/each}
                        {/if}

                        <DropdownMenu.Separator class="bg-zinc-800" />
                        <DropdownMenu.Item
                            class="text-emerald-400 focus:bg-zinc-800 focus:text-emerald-300 cursor-pointer"
                            onclick={openSavePresetDialog}
                        >
                            {$t("table.save_current_preset")}
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

                <ColumnSelector state={orderState} />
            </div>
        </div>
    </Card.Header>
    <Card.Content>
        <div class="rounded-md border border-zinc-800">
            <Table.Root class="table-fixed">
                <Table.Header>
                    <Table.Row class="border-zinc-800 hover:bg-transparent">
                        <Table.Head class="w-[32px] px-1 text-center">
                            <Checkbox
                                checked={orderState.paginatedOrders.length > 0 &&
                                    orderState.paginatedOrders.every((o: Order) =>
                                        orderState.selectedIds.has(o.id),
                                    )}
                                onCheckedChange={() =>
                                    orderState.toggleAll(
                                        orderState.paginatedOrders.map(
                                            (o: Order) => o.id,
                                        ),
                                    )}
                                class="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                        </Table.Head>
                        {#each orderState.visibleColumns as col (col.id)}
                            {#if col.id === "date_formatted"}
                                <th
                                    use:resizable
                                    class="h-12 px-1 text-left align-middle font-medium text-zinc-400 w-[100px]"
                                >
                                    <div class="flex items-center gap-0.5">
                                        <ColumnFilter
                                            title={$t("table.date")}
                                            options={orderState.filterOptions.date}
                                            bind:selected={
                                                orderState.activeFilters.date
                                            }
                                        />
                                        <button
                                            onclick={() => orderState.toggleSort()}
                                            class="flex items-center hover:text-white transition-colors"
                                            title={$t("table.toggle_sort")}
                                        >
                                            <span
                                                class="text-[10px] opacity-70 flex-shrink-0"
                                                >{orderState.sortDirection === "asc"
                                                    ? "↑"
                                                    : "↓"}</span
                                            >
                                        </button>
                                    </div>
                                </th>
                            {:else if col.id === "description"}
                                <th
                                    use:resizable
                                    class="h-12 px-1 text-left align-middle font-medium text-zinc-400 w-[300px] overflow-hidden text-ellipsis whitespace-nowrap"
                                    >{$t("table.description")}</th
                                >
                            {:else if col.id === "provider"}
                                <th
                                    use:resizable
                                    class="h-12 px-1 text-left align-middle font-medium text-zinc-400 overflow-hidden"
                                >
                                    <ColumnFilter
                                        title={$t("table.provider")}
                                        options={orderState.filterOptions.provider}
                                        bind:selected={
                                            orderState.activeFilters.provider
                                        }
                                    />
                                </th>
                            {:else if col.id === "price_formatted"}
                                <th
                                    use:resizable
                                    class="h-12 px-1 text-right align-middle font-medium text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >{$t("table.price")}</th
                                >
                            {:else if col.id === "ordered_by"}
                                <th
                                    use:resizable
                                    class="h-12 px-1 text-left align-middle font-medium text-zinc-400 overflow-hidden"
                                >
                                    <ColumnFilter
                                        title={$t("table.requester")}
                                        options={orderState.filterOptions.requester}
                                        bind:selected={
                                            orderState.activeFilters.requester
                                        }
                                    />
                                </th>
                            {:else if col.id === "status"}
                                <th
                                    use:resizable
                                    class="h-12 px-1 text-left align-middle font-medium text-zinc-400 overflow-hidden"
                                >
                                    <ColumnFilter
                                        title={$t("table.status")}
                                        options={orderState.filterOptions.status}
                                        formatOption={(option: string) =>
                                            localizeStatus(option, $t)}
                                        bind:selected={
                                            orderState.activeFilters.status
                                        }
                                    />
                                </th>
                            {:else if col.id === "actions"}
                                <th
                                    class="h-12 px-1 text-right align-middle font-medium text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >{$t("table.actions")}</th
                                >
                            {:else if col.id === "quantity"}
                                <th
                                    use:resizable
                                    class="h-12 px-1 text-center align-middle font-medium text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >{$t("table.qty")}</th
                                >
                            {:else}
                                <th
                                    use:resizable
                                    class="h-12 px-1 text-left align-middle font-medium text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap"
                                    >{columnLabel(col.id, col.label)}</th
                                >
                            {/if}
                        {/each}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if orderState.filteredOrders.length === 0}
                        <Table.Row>
                            <Table.Cell
                                colspan={orderState.visibleColumns.length + 1}
                                class="h-24 text-center text-zinc-500"
                            >
                                {$t("table.no_orders")}
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each orderState.groupedOrders as group, i (group.key)}
                            {@const rowColor =
                                orderState.groupBy !== "none"
                                    ? groupColors[i % groupColors.length]
                                    : ""}
                            <!-- Group Header -->
                            {#if orderState.groupBy !== "none"}
                                <Table.Row
                                    class="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800/50"
                                >
                                    <Table.Cell
                                        colspan={orderState.visibleColumns.length +
                                            1}
                                        class="py-2 px-4"
                                    >
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="font-semibold text-zinc-200"
                                            >
                                                {renderGroupLabel(group)}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                class="bg-zinc-700 text-zinc-300 text-xs"
                                            >
                                                {group.orders.length}
                                                {group.orders.length === 1
                                                    ? $t("table.order_singular")
                                                    : $t("table.order_plural")}
                                            </Badge>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {/if}

                            {#each group.orders as order (order.id)}
                                <OrderRow
                                    rowClass={rowColor}
                                    isSelected={orderState.selectedIds.has(order.id)}
                                    onToggleSelect={() =>
                                        orderState.toggleSelection(order.id)}
                                    {order}
                                    visibleColumns={orderState.visibleColumns}
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
        <!-- Pagination Footer -->
        {#if orderState.filteredOrders.length > 0}
            <PaginationControls
                currentPage={orderState.currentPage}
                totalPages={orderState.totalPages}
                pageSize={orderState.pageSize}
                totalItems={orderState.pageInfo.total}
                startItem={orderState.pageInfo.start}
                endItem={orderState.pageInfo.end}
                onPageChange={(page) => orderState.setPage(page)}
                onPageSizeChange={(size) => orderState.setPageSize(size)}
            />
        {/if}
    </Card.Content>
</Card.Root>

<FloatingActionBar
    count={orderState.selectedIds.size}
    onClear={() => orderState.clearSelection()}
    onReceive={() => onBulkReceive(Array.from(orderState.selectedIds) as string[])}
    onDelete={handleBulkDelete}
    onExport={handleBulkExport}
/>

<ConfirmDialog
    bind:open={isBulkDeleteConfirmOpen}
    title={$t("table.confirm_delete_title")}
    description={$t("table.confirm_delete_description")}
    confirmText={$t("common.delete")}
    confirmVariant="destructive"
    onConfirm={confirmBulkDelete}
/>

<Dialog.Root bind:open={isSavePresetDialogOpen}>
    <Dialog.Content class="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <Dialog.Header>
            <Dialog.Title>{$t("table.preset.dialog_title")}</Dialog.Title>
            <Dialog.Description class="text-zinc-400">
                {$t("table.preset.dialog_description")}
            </Dialog.Description>
        </Dialog.Header>

        <div class="grid gap-2 py-2">
            <label for="preset-name" class="text-sm text-zinc-300">
                {$t("table.preset.name")}
            </label>
            <Input
                id="preset-name"
                bind:value={presetName}
                placeholder={$t("table.preset.placeholder")}
                class="bg-zinc-900 border-zinc-700 text-zinc-100"
                onkeydown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        savePreset();
                    }
                }}
            />
        </div>

        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => (isSavePresetDialogOpen = false)}
                class="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
                {$t("common.cancel")}
            </Button>
            <Button
                onclick={savePreset}
                class="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                {$t("table.preset.save")}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
