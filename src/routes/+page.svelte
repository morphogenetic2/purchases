<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import OrderDialog from "$lib/components/OrderDialog.svelte";
  import OrderToolbar from "$lib/components/OrderToolbar.svelte";
  import OrderTable from "$lib/components/OrderTable.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import { OrderState } from "$lib/state/orderState.svelte";
  import { orderService } from "$lib/services/orderService";
  import { addToast } from "$lib/state/toastState";
  import { exportOrdersToExcel } from "$lib/utils/export";
  import type { Order, RealtimeEventPayload } from "$lib/types";
  import ExportDialog from "$lib/components/ExportDialog.svelte";
  import { supabase } from "$lib/supabaseClient";
  import ReceiveDialog from "$lib/components/ReceiveDialog.svelte";
  import { t } from "$lib/i18n";

  let { data } = $props();

  // Initialize State
  // svelte-ignore state_referenced_locally
  let orderState = new OrderState((data.orders as Order[]) || []);
  let isExportOpen = $state(false);

  // Sync state when data refreshes (e.g. after invalidateAll)
  $effect(() => {
    orderState.setOrders((data.orders as Order[]) || []);
  });

  // Realtime Subscription
  $effect(() => {
    const channel = supabase
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          orderState.handleRealtimeEvent(
            payload as unknown as RealtimeEventPayload<Order>,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });

  // Reset pagination when search/filters change
  $effect(() => {
    // Track these values to trigger reset
    const _ = orderState.searchTerm;
    const __ = orderState.activeFilters;
    orderState.setPage(1);
  });

  // Persist table preferences locally
  $effect(() => {
    const _columns = orderState.columns.map(
      (column) => `${column.id}:${column.visible}`,
    ).join("|");
    const _filters = JSON.stringify(orderState.activeFilters);
    const _pageSize = orderState.pageSize;
    const _groupBy = orderState.groupBy;
    void _columns;
    void _filters;
    void _pageSize;
    void _groupBy;
    orderState.savePreferences();
  });

  // --- Actions ---
  let isReceiveOpen = $state(false);
  let receivingOrders = $state<Order[]>([]);

  async function handleQuickReceive(id: string) {
    const order = orderState.rawOrders.find((o) => o.id === id);
    if (order) {
      receivingOrders = [order];
      isReceiveOpen = true;
    }
  }

  async function handleBulkReceiveRequest(ids: string[]) {
    receivingOrders = orderState.rawOrders.filter((o) => ids.includes(o.id));
    isReceiveOpen = true;
  }

  let isRevertConfirmOpen = $state(false);
  let revertTargetId = $state<string | null>(null);

  function handleRevertReceive(id: string) {
    revertTargetId = id;
    isRevertConfirmOpen = true;
  }

  async function confirmRevertReceive() {
    if (!revertTargetId) return false;

    const targetOrder = orderState.rawOrders.find((o) => o.id === revertTargetId);
    if (!targetOrder) return false;

    const previous = {
      status: targetOrder.status,
      received_date: targetOrder.received_date,
      storage_location: targetOrder.storage_location,
      quantity_received: targetOrder.quantity_received,
      is_received: targetOrder.is_received,
    };

    Object.assign(targetOrder, {
      status: "requested",
      received_date: null,
      storage_location: null,
      quantity_received: 0,
      is_received: false,
    });

    const { data, error } = await orderService.revertReceive(revertTargetId);
    if (error) {
      Object.assign(targetOrder, previous);
      addToast($t("page.toast.revert_error", { error: error.message }), "error");
      return false;
    }

    if (data && typeof data === "object") {
      Object.assign(targetOrder, data);
    }

    addToast($t("page.toast.revert_success"), "success");
    revertTargetId = null;
    return true;
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
    onExport={() => (isExportOpen = true)}
    onNewOrder={handleAdd}
    requesters={orderState.filterOptions.requester}
    existingOrders={orderState.rawOrders}
  />

  <OrderTable
    state={orderState}
    onEdit={handleEdit}
    onReceive={handleQuickReceive}
    onBulkReceive={handleBulkReceiveRequest}
    onRevert={handleRevertReceive}
  />
</div>

<ExportDialog
  bind:open={isExportOpen}
  state={orderState}
  onExport={exportOrdersToExcel}
/>

<OrderDialog
  bind:isOpen={isSheetOpen}
  order={editingOrder}
  providers={orderState.filterOptions.provider}
  requesters={orderState.filterOptions.requester}
  onSave={() => invalidateAll()}
/>

<ReceiveDialog
  bind:isOpen={isReceiveOpen}
  orders={receivingOrders}
  onSave={() => invalidateAll()}
/>

<ConfirmDialog
  bind:open={isRevertConfirmOpen}
  title={$t("page.revert_title")}
  description={$t("page.revert_description")}
  confirmText={$t("page.revert_confirm")}
  confirmVariant="destructive"
  onConfirm={confirmRevertReceive}
/>
