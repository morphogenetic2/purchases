<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { addToast } from "$lib/state/toastState";
    import { ORDER_STATUS } from "$lib/constants";

    import { orderService } from "$lib/services/orderService";
    import { Trash2 } from "lucide-svelte";

    import { PREDEFINED_ORDERED_BY } from "$lib/constants";
    import { t } from "$lib/i18n";
    let {
        order = null,
        isOpen = $bindable(false),
        providers = [],
        requesters = [],
        onSave,
    } = $props();

    // Combine predefined defaults with dynamic ones
    let requesterSuggestions = $derived(
        Array.from(new Set([...PREDEFINED_ORDERED_BY, ...requesters])).sort()
    );

    let isLoading = $state(false);
    let isDeleteConfirmOpen = $state(false);

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
            addToast(
                $t("order_dialog.toast.required_fields"),
                "error",
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
            addToast($t("order_dialog.toast.saved"), "success");
            isOpen = false;
        } catch (err: any) {
            console.error("Save error:", err);
            addToast($t("order_dialog.toast.save_error", { error: err.message }), "error");
        } finally {
            isLoading = false;
        }
    }
    function handleDelete() {
        if (!order?.id) return;
        isDeleteConfirmOpen = true;
    }

    async function confirmDelete() {
        if (!order?.id) return false;

        isLoading = true;
        try {
            const { error } = await orderService.deleteOrder(order.id);
            if (error) throw error;
            if (onSave) onSave(); // Refresh list
            addToast($t("order_dialog.toast.deleted"), "success");
            isOpen = false;
            return true;
        } catch (err: any) {
            console.error("Delete error:", err);
            addToast($t("order_dialog.toast.delete_error", { error: err.message }), "error");
            return false;
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
                >{order ? $t("order_dialog.edit_title") : $t("order_dialog.new_title")}</Dialog.Title
            >
            <Dialog.Description class="text-zinc-400">
                {order
                    ? $t("order_dialog.edit_description")
                    : $t("order_dialog.new_description")}
            </Dialog.Description>
        </Dialog.Header>

        <div class="flex-1 overflow-y-auto p-6 grid gap-6">
            <div class="grid gap-2">
                <Label for="description" class="text-zinc-300"
                    >{$t("order_dialog.description")} <span class="text-red-500">*</span></Label
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
                        >{$t("order_dialog.reference")} <span class="text-red-500">*</span></Label
                    >
                    <Input
                        id="sku"
                        bind:value={formData.sku}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="quantity" class="text-zinc-300"
                        >{$t("order_dialog.quantity")} <span class="text-red-500">*</span></Label
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
                    <Label for="provider" class="text-zinc-300">{$t("order_dialog.provider")}</Label>
                    <Input
                        id="provider"
                        bind:value={formData.provider}
                        list="provider-list"
                        placeholder={$t("order_dialog.provider_placeholder")}
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
                        >{$t("order_dialog.ordered_by")} <span class="text-red-500">*</span></Label
                    >
                    <Input
                        id="ordered_by"
                        bind:value={formData.ordered_by}
                        list="requester-list"
                        placeholder={$t("order_dialog.requester_placeholder")}
                        class="bg-zinc-900 border-zinc-700"
                    />
                    <datalist id="requester-list">
                        {#each requesterSuggestions as req}
                            <option value={req}></option>
                        {/each}
                    </datalist>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
                <div class="grid gap-2">
                    <Label for="project_code" class="text-zinc-300"
                        >{$t("order_dialog.project_code")} <span class="text-red-500">*</span></Label
                    >
                    <Input
                        id="project_code"
                        bind:value={formData.project_code}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="po_number" class="text-zinc-300"
                        >{$t("order_dialog.po_number")}</Label
                    >
                    <Input
                        id="po_number"
                        bind:value={formData.po_number}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
            </div>

            <div class="grid gap-2">
                <Label for="unit_price" class="text-zinc-300">{$t("order_dialog.unit_price")}</Label>
                <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    bind:value={formData.unit_price}
                    class="bg-zinc-900 border-zinc-700"
                />
            </div>

            <div class="h-px bg-zinc-800 my-2"></div>

            <h3 class="text-sm font-medium text-zinc-400">{$t("order_dialog.receiving_info")}</h3>

            <div class="grid grid-cols-2 gap-6">
                <div class="grid gap-2">
                    <Label for="storage_location" class="text-zinc-300"
                        >{$t("order_dialog.storage_location")}</Label
                    >
                    <Input
                        id="storage_location"
                        bind:value={formData.storage_location}
                        class="bg-zinc-900 border-zinc-700"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="received_date" class="text-zinc-300"
                        >{$t("order_dialog.received_date")}</Label
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
                    <Trash2 class="mr-2 h-4 w-4" /> {$t("order_dialog.delete_order")}
                </Button>
            {:else}
                <div></div>
            {/if}

            <div class="flex gap-2">
                <Button
                    variant="outline"
                    onclick={() => (isOpen = false)}
                    class="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                >
                    {$t("common.cancel")}
                </Button>

                <Button
                    onclick={handleSubmit}
                    disabled={isLoading}
                    class="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    {isLoading ? $t("order_dialog.saving") : $t("order_dialog.save_order")}
                </Button>
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>

<ConfirmDialog
    bind:open={isDeleteConfirmOpen}
    title={$t("order_dialog.confirm_delete_title")}
    description={$t("order_dialog.confirm_delete_description")}
    confirmText={$t("common.delete")}
    confirmVariant="destructive"
    onConfirm={confirmDelete}
/>
