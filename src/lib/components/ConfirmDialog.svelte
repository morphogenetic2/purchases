<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { t } from "$lib/i18n";

    let {
        open = $bindable(false),
        title = "",
        description = "",
        confirmText = "",
        cancelText = "",
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
            <Dialog.Title>{title || $t("confirm.title_default")}</Dialog.Title>
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
                {cancelText || $t("common.cancel")}
            </Button>
            <Button
                variant={confirmVariant === "destructive"
                    ? "destructive"
                    : "default"}
                onclick={handleConfirm}
                disabled={isLoading}
            >
                {isLoading
                    ? $t("common.processing")
                    : (confirmText || $t("common.confirm"))}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
