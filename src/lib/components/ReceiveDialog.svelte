<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { ORDER_STATUS } from "$lib/constants";
    import { orderService } from "$lib/services/orderService";
    import { addToast } from "$lib/state/toastState";
    import { t } from "$lib/i18n";

    import type { Order } from "$lib/types";

    let {
        orders = [] as Order[],
        isOpen = $bindable(false),
        onSave,
    } = $props<{
        orders: Order[];
        isOpen: boolean;
        onSave: () => void;
    }>();

    let isLoading = $state(false);
    let receivedDate = $state(new Date().toISOString().split("T")[0]);
    let storageLocation = $state("");
    let receiveQuantity = $state(0);

    // Derived state for single order mode
    const singleOrder = $derived(orders.length === 1 ? orders[0] : null);
    const maxQuantity = $derived(
        singleOrder
            ? singleOrder.quantity - (singleOrder.quantity_received || 0)
            : 0,
    );

    // Reset fields when opening
    $effect(() => {
        if (isOpen) {
            receivedDate = new Date().toISOString().split("T")[0];
            storageLocation = "";
            if (singleOrder) {
                receiveQuantity = maxQuantity;
            }
        }
    });

    async function handleReceive() {
        if (orders.length === 0) return;
        isLoading = true;
        try {
            // Partial receive logic just for single order
            if (singleOrder) {
                if (maxQuantity <= 0) {
                    throw new Error($t("receive.already_received"));
                }

                const quantityToReceive = Number(receiveQuantity);
                if (!Number.isFinite(quantityToReceive) || quantityToReceive <= 0) {
                    throw new Error($t("receive.quantity_min"));
                }

                if (quantityToReceive > maxQuantity) {
                    throw new Error(
                        $t("receive.quantity_max", { count: maxQuantity }),
                    );
                }
                const newTotalReceived =
                    (singleOrder.quantity_received || 0) + quantityToReceive;
                const isFullyReceived =
                    newTotalReceived >= singleOrder.quantity;

                const previous = {
                    status: singleOrder.status,
                    received_date: singleOrder.received_date,
                    quantity_received: singleOrder.quantity_received,
                    storage_location: singleOrder.storage_location,
                    is_received: singleOrder.is_received,
                };
                const optimisticUpdate = {
                    status: isFullyReceived
                        ? ORDER_STATUS.RECEIVED
                        : ORDER_STATUS.PARTIALLY_RECEIVED,
                    received_date: isFullyReceived ? receivedDate : undefined,
                    quantity_received: newTotalReceived,
                    storage_location:
                        storageLocation || singleOrder.storage_location,
                    is_received: isFullyReceived,
                };
                Object.assign(singleOrder, optimisticUpdate);

                const { data, error } = await orderService.updateOrder(
                    singleOrder.id,
                    optimisticUpdate,
                );
                if (error) {
                    Object.assign(singleOrder, previous);
                    throw error;
                }

                if (data && typeof data === "object") {
                    Object.assign(singleOrder, data);
                }
            } else {
                // Bulk receive (always full)
                const ids = orders.map((o: Order) => o.id);
                const snapshots: Array<{
                    order: Order;
                    previous: {
                        status: string;
                        received_date?: string;
                        quantity_received?: number;
                        storage_location?: string;
                        is_received?: boolean;
                    };
                }> = orders.map((order: Order) => ({
                    order,
                    previous: {
                        status: order.status,
                        received_date: order.received_date,
                        quantity_received: order.quantity_received,
                        storage_location: order.storage_location,
                        is_received: order.is_received,
                    },
                }));

                orders.forEach((order: Order) => {
                    Object.assign(order, {
                        status: ORDER_STATUS.RECEIVED,
                        received_date: receivedDate,
                        quantity_received: order.quantity,
                        storage_location:
                            storageLocation.trim() || order.storage_location,
                        is_received: true,
                    });
                });

                const { error } = await orderService.bulkReceive(ids, {
                    receivedDate,
                    storageLocation: storageLocation.trim() || undefined,
                });
                if (error) {
                    snapshots.forEach(
                        ({
                            order,
                            previous,
                        }: {
                            order: Order;
                            previous: {
                                status: string;
                                received_date?: string;
                                quantity_received?: number;
                                storage_location?: string;
                                is_received?: boolean;
                            };
                        }) => {
                        Object.assign(order, previous);
                        },
                    );
                    throw error;
                }
            }

            if (onSave) onSave();
            addToast(
                orders.length === 1
                    ? $t("receive.toast.success_singular", { count: orders.length })
                    : $t("receive.toast.success_plural", { count: orders.length }),
                "success",
            );
            isOpen = false;
        } catch (err: any) {
            console.error("Receive error:", err);
            addToast($t("receive.toast.error", { error: err.message }), "error");
        } finally {
            isLoading = false;
        }
    }
</script>

<Dialog.Root bind:open={isOpen}>
    <Dialog.Content
        class="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]"
    >
        <Dialog.Header>
            <Dialog.Title
                >{orders.length > 1 ? $t("receive.title_orders") : $t("receive.title_order")}</Dialog.Title
            >
            <Dialog.Description class="text-zinc-400">
                {orders.length > 1
                    ? $t("receive.description_multi")
                    : $t("receive.description_single")}
            </Dialog.Description>
        </Dialog.Header>

        <div class="grid gap-4 py-4">
            {#if singleOrder}
                <div class="grid gap-2">
                    <Label for="receive_qty" class="text-zinc-300"
                        >{$t("receive.quantity_to_receive")}</Label
                    >
                    <div class="flex items-center gap-2">
                        <Input
                            id="receive_qty"
                            type="number"
                            min="1"
                            max={maxQuantity}
                            bind:value={receiveQuantity}
                            class="bg-zinc-900 border-zinc-700"
                        />
                        <span class="text-xs text-zinc-500 whitespace-nowrap">
                            {$t("receive.remaining", { count: maxQuantity })}
                        </span>
                    </div>
                </div>
            {/if}

            <div class="grid gap-2">
                <Label for="received_date" class="text-zinc-300"
                    >{$t("receive.reception_date")}</Label
                >
                <Input
                    id="received_date"
                    type="date"
                    bind:value={receivedDate}
                    class="bg-zinc-900 border-zinc-700"
                />
            </div>
            <div class="grid gap-2">
                <Label for="storage_location" class="text-zinc-300"
                    >{$t("receive.storage_location_optional")}</Label
                >
                <Input
                    id="storage_location"
                    placeholder={$t("receive.storage_placeholder")}
                    bind:value={storageLocation}
                    class="bg-zinc-900 border-zinc-700"
                    onkeydown={(e) => e.key === "Enter" && handleReceive()}
                />
            </div>
        </div>

        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => (isOpen = false)}
                class="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
                {$t("common.cancel")}
            </Button>
            <Button
                type="button"
                onclick={handleReceive}
                disabled={isLoading}
                class="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                {isLoading ? $t("common.processing") : $t("receive.mark_received")}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
