<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { ORDER_STATUS } from "$lib/constants";
    import { orderService } from "$lib/services/orderService";

    let { orderIds = [], isOpen = $bindable(false), onSave } = $props();

    let isLoading = $state(false);
    let receivedDate = $state(new Date().toISOString().split("T")[0]);
    let storageLocation = $state("");

    // Reset fields when opening
    $effect(() => {
        if (isOpen) {
            receivedDate = new Date().toISOString().split("T")[0];
            storageLocation = "";
        }
    });

    async function handleReceive() {
        if (orderIds.length === 0) return;
        isLoading = true;
        try {
            const { error } = await orderService.bulkUpdate(orderIds, {
                status: ORDER_STATUS.RECEIVED,
                received_date: receivedDate,
                storage_location: storageLocation,
                is_received: true,
            });

            if (error) throw error;

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
                >Receive {orderIds.length > 1
                    ? "Orders"
                    : "Order"}</Dialog.Title
            >
            <Dialog.Description class="text-zinc-400">
                Confirm reception date and storage location{orderIds.length > 1
                    ? " for all selected orders"
                    : ""}.
            </Dialog.Description>
        </Dialog.Header>

        <div class="grid gap-4 py-4">
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
                onclick={handleReceive}
                disabled={isLoading}
                class="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                {isLoading ? "Processing..." : "Mark as Received"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
