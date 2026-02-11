<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { ORDER_STATUS } from "$lib/constants";
    import { orderService } from "$lib/services/orderService";

    import type { Order } from "$lib/types";

    let {
        orders = [],
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
                    throw new Error("This order is already fully received");
                }

                const quantityToReceive = Number(receiveQuantity);
                if (!Number.isFinite(quantityToReceive) || quantityToReceive <= 0) {
                    throw new Error("Quantity to receive must be at least 1");
                }

                if (quantityToReceive > maxQuantity) {
                    throw new Error(
                        `Cannot receive more than remaining quantity (${maxQuantity})`,
                    );
                }
                const newTotalReceived =
                    (singleOrder.quantity_received || 0) + quantityToReceive;
                const isFullyReceived =
                    newTotalReceived >= singleOrder.quantity;

                const { error } = await orderService.updateOrder(
                    singleOrder.id,
                    {
                        status: isFullyReceived
                            ? ORDER_STATUS.RECEIVED
                            : ORDER_STATUS.PARTIALLY_RECEIVED,
                        received_date: isFullyReceived
                            ? receivedDate
                            : undefined, // Only set completion date if full? Or update latest? Let's use latest.
                        // Actually user usually wants to track WHEN they received THIS batch.
                        // But DB only has one received_date. Let's update it to "latest receipt".
                        quantity_received: newTotalReceived,
                        storage_location:
                            storageLocation || singleOrder.storage_location, // Keep existing if not provided? Or overwrite?
                        // If overwrite logic:
                        // storage_location: storageLocation,
                        is_received: isFullyReceived,
                    },
                );
                if (error) throw error;
            } else {
                // Bulk receive (always full)
                const ids = orders.map((o: Order) => o.id);
                const { error } = await orderService.bulkReceive(ids, {
                    receivedDate,
                    storageLocation: storageLocation.trim() || undefined,
                });
                if (error) throw error;
            }

            if (onSave) onSave();
            isOpen = false;
        } catch (err: any) {
            console.error("Receive error:", err);
            alert("Error: " + err.message);
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
                >Receive {orders.length > 1 ? "Orders" : "Order"}</Dialog.Title
            >
            <Dialog.Description class="text-zinc-400">
                Confirm reception date and storage location{orders.length > 1
                    ? " for all selected orders"
                    : ""}.
            </Dialog.Description>
        </Dialog.Header>

        <div class="grid gap-4 py-4">
            {#if singleOrder}
                <div class="grid gap-2">
                    <Label for="receive_qty" class="text-zinc-300"
                        >Quantity to Receive</Label
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
                            / {maxQuantity} remaining
                        </span>
                    </div>
                </div>
            {/if}

            <div class="grid gap-2">
                <Label for="received_date" class="text-zinc-300"
                    >Reception Date</Label
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
                    >Storage Location (Optional)</Label
                >
                <Input
                    id="storage_location"
                    placeholder="Where is it stored?"
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
                class="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
                Cancel
            </Button>
            <Button
                type="button"
                onclick={handleReceive}
                disabled={isLoading}
                class="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                {isLoading ? "Processing..." : "Mark as Received"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
