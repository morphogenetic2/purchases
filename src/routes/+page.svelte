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

    // Sync state when data refreshes (e.g. after invalidateAll)
    $effect(() => {
        orderState.setOrders((data.orders as Order[]) || []);
    });

    // Reset pagination when search/filters change
    $effect(() => {
        // Track these values to trigger reset
        const _ = orderState.searchTerm;
        const __ = orderState.activeFilters;
        orderState.setPage(1);
    });

    // --- Actions ---

    async function handleQuickReceive(id: string) {
        const { error } = await orderService.quickReceive(id);
        if (error) {
            alert("Error updating order: " + error.message);
        } else {
            invalidateAll();
        }
    }

    async function handleRevertReceive(id: string) {
        if (!confirm("Revert to non-received?")) return;
        const { error } = await orderService.revertReceive(id);
        if (error) {
            alert("Error updating order: " + error.message);
        } else {
            invalidateAll();
        }
    }

    function handleWipe() {
        // This is triggered by the Toolbar component's success callback
        invalidateAll();
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
    />
</div>

<OrderDialog
    bind:isOpen={isSheetOpen}
    order={editingOrder}
    providers={orderState.uniqueProviders}
    onSave={() => invalidateAll()}
/>
