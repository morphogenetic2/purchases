<script lang="ts">
    let { form } = $props();
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import * as Card from "$lib/components/ui/card";
    import { Label } from "$lib/components/ui/label";
</script>

<div
    class="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-100 p-4"
>
    <Card.Root
        class="w-full max-w-[350px] border-zinc-800 bg-zinc-900 text-zinc-100 shadow-xl"
    >
        <Card.Header>
            <Card.Title class="text-2xl font-bold text-center"
                >Lab Access</Card.Title
            >
            <Card.Description class="text-zinc-400 text-center"
                >Enter the lab shared password.</Card.Description
            >
        </Card.Header>
        <form method="POST">
            <Card.Content>
                <div class="grid w-full items-center gap-4">
                    <div class="flex flex-col space-y-2">
                        <Label for="password" class="text-zinc-200"
                            >Password</Label
                        >
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            class="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                        />
                    </div>
                    {#if form?.incorrect}
                        <p class="text-sm font-medium text-red-500">
                            Incorrect password.
                        </p>
                    {/if}
                </div>
            </Card.Content>
            <Card.Footer class="flex justify-end pt-2">
                <Button
                    type="submit"
                    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                    >Unlock</Button
                >
            </Card.Footer>
        </form>
    </Card.Root>
</div>
