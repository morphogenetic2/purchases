<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { orderService } from "$lib/services/orderService";

    let { open = $bindable(false), onWipe } = $props();

    let step = $state(1); // 1: Password, 2: Confirmation
    let password = $state("");
    let error = $state("");
    let isLoading = $state(false);

    async function handleNext() {
        isLoading = true;
        try {
            const response = await fetch("/api/verify-wipe-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.valid) {
                    step = 2;
                    error = "";
                } else {
                    error = "Incorrect password";
                }
            } else {
                error = "Server error verifying password";
            }
        } catch (e) {
            console.error(e);
            error = "Error verifying password";
        } finally {
            isLoading = false;
        }
    }

    async function handleWipe() {
        isLoading = true;
        try {
            const { error: err } = await orderService.deleteAllOrders();
            if (err) throw err;
            if (onWipe) onWipe();
            open = false;
        } catch (e: any) {
            alert(e.message);
        } finally {
            isLoading = false;
        }
    }

    // Reset when opening
    $effect(() => {
        if (open) {
            step = 1;
            password = "";
            error = "";
        }
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Content
        class="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-zinc-100"
    >
        <Dialog.Header>
            <Dialog.Title class="text-white">Wipe Database</Dialog.Title>
            <Dialog.Description class="text-zinc-400">
                {#if step === 1}
                    Enter the administrator password to continue.
                {:else}
                    Final confirmation required.
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        <div class="grid gap-4 py-4">
            {#if step === 1}
                <div class="grid gap-2">
                    <Label for="password" class="text-zinc-300">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        bind:value={password}
                        disabled={isLoading}
                        class="bg-zinc-950 border-zinc-700 text-white"
                        onkeydown={(e) => e.key === "Enter" && handleNext()}
                    />
                    {#if error}
                        <p class="text-red-500 text-sm">{error}</p>
                    {/if}
                </div>
            {:else}
                <div
                    class="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 font-medium text-center"
                >
                    The database is about to be deleted, are you sure?
                </div>
            {/if}
        </div>

        <Dialog.Footer>
            {#if step === 1}
                <Button
                    variant="outline"
                    onclick={() => (open = false)}
                    class="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >Cancel</Button
                >
                <Button
                    onclick={handleNext}
                    disabled={isLoading}
                    class="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                    >{isLoading && step === 1 ? "Verifying..." : "Next"}</Button
                >
            {:else}
                <Button
                    variant="outline"
                    onclick={() => (open = false)}
                    class="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >Cancel</Button
                >
                <Button
                    variant="destructive"
                    onclick={handleWipe}
                    disabled={isLoading}
                >
                    {isLoading ? "Wiping..." : "Yes, delete everything"}
                </Button>
            {/if}
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
