<script lang="ts">
  import { Loader2, Merge, Search, Trash2, TriangleAlert } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { orderService } from "$lib/services/orderService";
  import { addToast } from "$lib/state/toastState";
  import { findDuplicateGroups } from "$lib/utils/duplicates";
  import { t } from "$lib/i18n";
  import type {
    DuplicateOrderGroup,
    DuplicateResolutionAction,
    Order,
  } from "$lib/types";

  let {
    orders = [],
    onResolved,
  } = $props<{
    orders: Order[];
    onResolved?: () => void | Promise<void>;
  }>();

  let open = $state(false);
  let pendingGroupKey = $state<string | null>(null);
  let pendingAction = $state<DuplicateResolutionAction | null>(null);

  const duplicateGroups = $derived(findDuplicateGroups(orders));
  const duplicateGroupCount = $derived(duplicateGroups.length);
  const duplicateRowCount = $derived(
    duplicateGroups.reduce((sum, group) => sum + group.orders.length, 0),
  );

  function displayValue(value?: string | null): string {
    return value?.trim() || "—";
  }

  async function resolveGroup(
    group: DuplicateOrderGroup,
    action: DuplicateResolutionAction,
  ) {
    pendingGroupKey = group.key;
    pendingAction = action;

    try {
      const { error } = await orderService.resolveDuplicateGroup({
        action,
        groupKey: group.key,
        ids: group.orders.map((order) => order.id),
      });

      if (error) {
        throw error;
      }

      if (onResolved) {
        await onResolved();
      }

      addToast(
        $t(
          action === "merge"
            ? "duplicates.toast.merge_success"
            : "duplicates.toast.delete_success",
          { count: group.orders.length - 1 },
        ),
        "success",
      );

      if (duplicateGroups.length === 1) {
        open = false;
      }
    } catch (err: any) {
      addToast(
        $t("duplicates.toast.error", {
          error: err?.message || "Unknown error",
        }),
        "error",
      );
    } finally {
      pendingGroupKey = null;
      pendingAction = null;
    }
  }
</script>

<Button
  variant="outline"
  size="sm"
  onclick={() => (open = true)}
  class="border-amber-700 bg-amber-950/60 text-amber-200 hover:border-amber-600 hover:bg-amber-900/70 hover:text-amber-50"
>
  <TriangleAlert class="mr-2 h-4 w-4" />
  {$t("duplicates.button")}
  {#if duplicateGroupCount > 0}
    <span
      class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-100"
    >
      {duplicateGroupCount}
    </span>
  {/if}
</Button>

<Dialog.Root bind:open>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-4xl">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Search class="h-5 w-5 text-amber-400" />
        {$t("duplicates.title")}
      </Dialog.Title>
      <Dialog.Description class="text-zinc-400">
        {#if duplicateGroupCount > 0}
          {$t("duplicates.description_found", {
            groups: duplicateGroupCount,
            orders: duplicateRowCount,
          })}
        {:else}
          {$t("duplicates.description_empty")}
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if duplicateGroupCount === 0}
      <div class="rounded-lg border border-zinc-800 bg-zinc-900/80 p-8 text-center">
        <p class="text-lg font-medium text-zinc-100">{$t("duplicates.empty_title")}</p>
        <p class="mt-2 text-sm text-zinc-400">{$t("duplicates.empty_description")}</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each duplicateGroups as group, index (group.key)}
          <section class="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-3">
                <div>
                  <p class="text-sm font-semibold text-zinc-100">
                    {$t("duplicates.group_title", { index: index + 1 })}
                  </p>
                  <p class="mt-1 text-sm text-zinc-400">
                    {$t("duplicates.group_summary", {
                      rows: group.orders.length,
                      quantity: group.totalQuantity,
                    })}
                  </p>
                </div>

                <div class="grid gap-2 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <span class="text-zinc-500">{$t("duplicates.field.date")}:</span>
                    {displayValue(group.orders[0]?.order_date)}
                  </div>
                  <div>
                    <span class="text-zinc-500">{$t("duplicates.field.provider")}:</span>
                    {displayValue(group.orders[0]?.provider)}
                  </div>
                  <div>
                    <span class="text-zinc-500">{$t("duplicates.field.sku")}:</span>
                    {displayValue(group.orders[0]?.sku)}
                  </div>
                  <div>
                    <span class="text-zinc-500">{$t("duplicates.field.requester")}:</span>
                    {displayValue(group.orders[0]?.ordered_by)}
                  </div>
                  <div>
                    <span class="text-zinc-500">{$t("duplicates.field.project")}:</span>
                    {displayValue(group.orders[0]?.project_code)}
                  </div>
                  <div>
                    <span class="text-zinc-500">{$t("duplicates.field.po")}:</span>
                    {displayValue(group.orders[0]?.po_number)}
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  onclick={() => resolveGroup(group, "merge")}
                  disabled={pendingGroupKey !== null}
                  class="bg-amber-600 text-white hover:bg-amber-500"
                >
                  {#if pendingGroupKey === group.key && pendingAction === "merge"}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {:else}
                    <Merge class="mr-2 h-4 w-4" />
                  {/if}
                  {$t("duplicates.merge")}
                </Button>
                <Button
                  variant="outline"
                  onclick={() => resolveGroup(group, "delete")}
                  disabled={pendingGroupKey !== null}
                  class="border-red-800 bg-red-950/40 text-red-200 hover:bg-red-900/60 hover:text-red-50"
                >
                  {#if pendingGroupKey === group.key && pendingAction === "delete"}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {:else}
                    <Trash2 class="mr-2 h-4 w-4" />
                  {/if}
                  {$t("duplicates.delete")}
                </Button>
              </div>
            </div>

            <div class="mt-4 overflow-hidden rounded-lg border border-zinc-800">
              <div class="grid grid-cols-[1.4fr,1fr,0.8fr,0.9fr,1fr] gap-3 bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <span>{$t("duplicates.table.description")}</span>
                <span>{$t("duplicates.table.id")}</span>
                <span>{$t("duplicates.table.quantity")}</span>
                <span>{$t("duplicates.table.received")}</span>
                <span>{$t("duplicates.table.status")}</span>
              </div>
              {#each group.orders as order, orderIndex (order.id)}
                <div class="grid grid-cols-[1.4fr,1fr,0.8fr,0.9fr,1fr] gap-3 border-t border-zinc-800 px-4 py-3 text-sm text-zinc-300">
                  <div class="min-w-0">
                    <p class="truncate text-zinc-100">{order.description}</p>
                    <p class="truncate text-xs text-zinc-500">{displayValue(order.created_at)}</p>
                  </div>
                  <span class={orderIndex === 0 ? "font-mono text-amber-300" : "font-mono text-zinc-400"}>
                    {order.id}
                  </span>
                  <span>{order.quantity}</span>
                  <span>{order.quantity_received || 0}</span>
                  <span class="capitalize">{displayValue(order.status)}</span>
                </div>
              {/each}
            </div>

            <p class="mt-3 text-xs text-zinc-500">
              {$t("duplicates.group_help")}
            </p>
          </section>
        {/each}
      </div>
    {/if}

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => (open = false)}
        disabled={pendingGroupKey !== null}
        class="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
      >
        {$t("portal.done_close")}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
