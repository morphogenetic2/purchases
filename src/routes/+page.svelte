<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import OrderDialog from "$lib/components/OrderDialog.svelte";
    import OrderToolbar from "$lib/components/OrderToolbar.svelte";
    import OrderTable from "$lib/components/OrderTable.svelte";
    import { OrderState } from "$lib/state/orderState.svelte";
    import { orderService } from "$lib/services/orderService";
    import { exportOrdersToExcel } from "$lib/utils/export";
    import type { Order } from "$lib/types";

    let { data } = $props();

    // Initialize State
    let orderState = new OrderState((data.orders as Order[]) || []);

    // Loading states
    let isLoading = $state(false);
    let loadingOrderId = $state<string | null>(null);

    // Sync state when data refreshes (e.g. after invalidateAll)
    $effect(() => {
        orderState.setOrders((data.orders as Order[]) || []);
        isLoading = false;
        loadingOrderId = null;
    });

    // --- Keyboard Shortcuts ---
    function handleKeydown(e: KeyboardEvent) {
        // Ignore if user is typing in an input
        if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement
        ) {
            return;
        }

        const isMod = e.metaKey || e.ctrlKey;

        // Ctrl/Cmd + N = New Order
        if (isMod && e.key === "n") {
            e.preventDefault();
            handleAdd();
        }
        // Ctrl/Cmd + E = Export
        if (isMod && e.key === "e") {
            e.preventDefault();
            exportOrdersToExcel(orderState.filteredOrders);
        }
    }

    // --- Actions ---

    async function handleQuickReceive(id: string) {
        loadingOrderId = id;
        const { error } = await orderService.quickReceive(id);
        if (error) {
            alert("Error updating order: " + error.message);
            loadingOrderId = null;
        } else {
            await invalidateAll();
        }
    }

    async function handleRevertReceive(id: string) {
        if (!confirm("Revert to non-received?")) return;
        loadingOrderId = id;
        const { error } = await orderService.revertReceive(id);
        if (error) {
            alert("Error updating order: " + error.message);
            loadingOrderId = null;
        } else {
            await invalidateAll();
        }
    }

    async function handleWipe() {
        // This is triggered by the Toolbar component's success callback
        isLoading = true;
        await invalidateAll();
    }

    // --- DIALOG Handling ---
    let isSheetOpen = $state(false);
    let editingOrder = $state<Order | null>(null);

    function handleAdd() {
        editingOrder = null;
        isSheetOpen = true;
    }

    function handleEdit(order: Order) {
        editingOrder = order;
        isSheetOpen = true;
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8">
    <OrderToolbar
        onExport={() => exportOrdersToExcel(orderState.filteredOrders)}
        onNewOrder={handleAdd}
        onWipe={handleWipe}
    />

    <OrderTable
        state={orderState}
        onEdit={handleEdit}
        onReceive={handleQuickReceive}
        onRevert={handleRevertReceive}
        {loadingOrderId}
    />
</div>

<OrderDialog
    bind:isOpen={isSheetOpen}
    order={editingOrder}
    providers={orderState.uniqueProviders}
    onSave={() => invalidateAll()}
/>
