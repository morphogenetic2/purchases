<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";

    let {
        open = $bindable(false),
        title = "Are you sure?",
        description = "",
        confirmText = "Confirm",
        cancelText = "Cancel",
        confirmVariant = "destructive",
        onConfirm,
    } = $props<{
        open: boolean;
        title?: string;
        description?: string;
        confirmText?: string;
        cancelText?: string;
        confirmVariant?: "default" | "destructive";
        onConfirm: () => Promise<boolean | void> | boolean | void;
    }>();

    let isLoading = $state(false);

    async function handleConfirm() {
        if (isLoading) return;
        isLoading = true;
        try {
            const result = await onConfirm();
            if (result !== false) {
                open = false;
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
            {#if description}
                <Dialog.Description class="text-zinc-400">
                    {description}
                </Dialog.Description>
            {/if}
        </Dialog.Header>

        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => (open = false)}
                disabled={isLoading}
                class="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
                {cancelText}
            </Button>
            <Button
                variant={confirmVariant === "destructive"
                    ? "destructive"
                    : "default"}
                onclick={handleConfirm}
                disabled={isLoading}
            >
                {isLoading ? "Processing..." : confirmText}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
