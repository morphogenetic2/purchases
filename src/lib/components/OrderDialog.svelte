<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import { cn } from "$lib/utils";
    import { ORDER_STATUS } from "$lib/constants";

    import { orderService } from "$lib/services/orderService";
    import { Trash2 } from "lucide-svelte";

    let {
        order = null,
        isOpen = $bindable(false),
        providers = [],
        onSave,
    } = $props();

    let isLoading = $state(false);
    let openProvider = $state(false);
    let searchProvider = $state("");

    let formData = $state({
        description: "",
        sku: "",
        provider: "",
        ordered_by: "",
        project_code: "",
        po_number: "",
        quantity: 1,
        unit_price: 0,
        storage_location: "",
        received_date: "",
        is_received: false,
    });

    // Sync formData when order changes or dialog opens
    $effect(() => {
        if (order) {
            formData = {
                description: order.description || "",
                sku: order.sku || "",
                provider: order.provider || "",
                ordered_by: order.ordered_by || "",
                project_code: order.project_code || "",
                po_number: order.po_number || "",
                quantity: order.quantity || 1,
                unit_price: order.unit_price || 0,
                storage_location: order.storage_location || "",
                received_date: order.received_date || "",
                is_received: order.is_received || false,
            };
        } else {
            // Reset for new order
            formData = {
                description: "",
                sku: "",
                provider: "",
                ordered_by: "",
                project_code: "",
                po_number: "",
                quantity: 1,
                unit_price: 0,
                storage_location: "",
                received_date: "",
                is_received: false,
            };
        }
    });

    async function handleSubmit() {
        // Validation
        if (
            !formData.description ||
            !formData.sku ||
            !formData.quantity ||
            !formData.ordered_by ||
            !formData.project_code
        ) {
            alert(
                "Please fill in all required fields: Description, SKU, Quantity, Ordered By, Project Code",
            );
            return;
        }

        isLoading = true;
        try {
            const dataToSave = {
                ...formData,
                id: order?.id,
                received_date: formData.received_date
                    ? formData.received_date
                    : undefined,
                status: formData.is_received
                    ? ORDER_STATUS.RECEIVED
                    : order?.status || ORDER_STATUS.REQUESTED,
                order_date:
                    order?.order_date || new Date().toISOString().split("T")[0],
            };

            const { error } = await orderService.upsertOrder(dataToSave);

            if (error) throw error;

            if (onSave) onSave();
            isOpen = false;
        } catch (err: any) {
            console.error("Save error:", err);
            alert("Error saving: " + err.message);
        } finally {
            isLoading = false;
        }
    }
    async function handleDelete() {
        if (!order?.id) return;
        if (!confirm("Are you sure you want to delete this order?")) return;

        isLoading = true;
        try {
            const { error } = await orderService.deleteOrder(order.id);
            if (error) throw error;
            if (onSave) onSave(); // Refresh list
            isOpen = false;
        } catch (err: any) {
            console.error("Delete error:", err);
            alert("Error deleting: " + err.message);
        } finally {
            isLoading = false;
        }
    }
</script>

<Dialog.Root bind:open={isOpen}>
    <Dialog.Content
        class="w-[70vw] max-w-[70vw] max-h-[80vh] bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col p-0 gap-0"
    >
        <Dialog.Header class="p-6 pb-4 border-b border-zinc-800">
            <Dialog.Title class="text-white text-xl"
                >{order ? "Edit Order" : "New Order"}</Dialog.Title
            >
            <Dialog.Description class="text-zinc-400">
                {order
                    ? "Make changes to your order here."
                    : "Fill in the details for the new order."}
            </Dialog.Description>
        </Dialog.Header>

        <div class="flex-1 overflow-y-auto p-6 grid gap-6">
            <div class="grid gap-2">
                <Label for="description" class="text-zinc-300"
                    >Description <span class="text-red-500">*</span></Label
                >
                <Textarea
                    id="description"
                    bind:value={formData.description}
                    class="bg-zinc-900 border-zinc-700 min-h-[80px]"
                />
            </div>

            <div class="grid grid-cols-2 gap-6">
                <div class="grid gap-2">
                    <Label for="sku" class="text-zinc-300"
                        >Reference <span class="text-red-500">*</span></Label
                    >
                    <Input
                        id="sku"
                        bind:value={formData.sku}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="quantity" class="text-zinc-300"
                        >Quantity <span class="text-red-500">*</span></Label
                    >
                    <Input
                        id="quantity"
                        type="number"
                        bind:value={formData.quantity}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
                <div class="grid gap-2">
                    <Label for="provider" class="text-zinc-300">Provider</Label>
                    <Input
                        id="provider"
                        bind:value={formData.provider}
                        list="provider-list"
                        placeholder="Select or type provider..."
                        class="bg-zinc-900 border-zinc-700"
                    />
                    <datalist id="provider-list">
                        {#each providers as provider}
                            <option value={provider}></option>
                        {/each}
                    </datalist>
                </div>
                <div class="grid gap-2">
                    <Label for="ordered_by" class="text-zinc-300"
                        >Ordered By <span class="text-red-500">*</span></Label
                    >
                    <Input
                        id="ordered_by"
                        bind:value={formData.ordered_by}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
                <div class="grid gap-2">
                    <Label for="project_code" class="text-zinc-300"
                        >Project Code <span class="text-red-500">*</span></Label
                    >
                    <Input
                        id="project_code"
                        bind:value={formData.project_code}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="po_number" class="text-zinc-300"
                        >PO Number</Label
                    >
                    <Input
                        id="po_number"
                        bind:value={formData.po_number}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
            </div>

            <div class="grid gap-2">
                <Label for="unit_price" class="text-zinc-300">Unit Price</Label>
                <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    bind:value={formData.unit_price}
                    class="bg-zinc-900 border-zinc-700"
                />
            </div>

            <div class="h-px bg-zinc-800 my-2"></div>

            <h3 class="text-sm font-medium text-zinc-400">Receiving Info</h3>

            <div class="grid grid-cols-2 gap-6">
                <div class="grid gap-2">
                    <Label for="storage_location" class="text-zinc-300"
                        >Storage Location</Label
                    >
                    <Input
                        id="storage_location"
                        bind:value={formData.storage_location}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="received_date" class="text-zinc-300"
                        >Received Date</Label
                    >
                    <Input
                        id="received_date"
                        type="date"
                        bind:value={formData.received_date}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
            </div>
        </div>

        <div
            class="p-6 pt-4 border-t border-zinc-800 flex justify-between items-center w-full shrink-0"
        >
            {#if order}
                <Button
                    variant="destructive"
                    onclick={handleDelete}
                    class="mr-auto"
                >
                    <Trash2 class="mr-2 h-4 w-4" /> Delete Order
                </Button>
            {:else}
                <div></div>
            {/if}

            <div class="flex gap-2">
                <Button
                    variant="outline"
                    onclick={() => (isOpen = false)}
                    class="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                    Cancel
                </Button>

                <Button
                    onclick={handleSubmit}
                    disabled={isLoading}
                    class="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    {isLoading ? "Saving..." : "Save Order"}
                </Button>
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
