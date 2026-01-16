<script lang="ts">
    import { Button, buttonVariants } from "$lib/components/ui/button";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import * as Popover from "$lib/components/ui/popover";
    import { Filter } from "lucide-svelte";
    import { Badge } from "$lib/components/ui/badge";

    let { title, options, selected = $bindable([]) } = $props();

    function toggleOption(option: string) {
        if (selected.includes(option)) {
            selected = selected.filter((o: string) => o !== option);
        } else {
            selected = [...selected, option];
        }
    }

    function toggleAll() {
        if (selected.length === options.length) {
            selected = [];
        } else {
            selected = [...options];
        }
    }

    let isOpen = $state(false);
</script>

<Popover.Root bind:open={isOpen}>
    <Popover.Trigger
        class={buttonVariants({
            variant: "ghost",
            size: "sm",
            class: "h-8 px-2 lg:px-3 text-zinc-400 hover:text-white hover:bg-transparent data-[state=open]:text-white data-[state=open]:bg-transparent",
        })}
    >
        <Filter class="mr-2 h-4 w-4" />
        <span class="">{title}</span>
        {#if selected.length > 0 && selected.length < options.length}
            <Badge
                variant="secondary"
                class="rounded-sm px-1 font-normal lg:hidden"
            >
                {selected.length}
            </Badge>
            <Badge
                variant="secondary"
                class="rounded-sm px-1 font-normal hidden lg:inline-flex bg-emerald-500/20 text-emerald-500"
            >
                {selected.length} selected
            </Badge>
        {/if}
    </Popover.Trigger>
    <Popover.Content
        class="w-[200px] p-0 bg-zinc-900 border-zinc-800 text-zinc-100"
        align="start"
    >
        <div class="p-2 border-b border-zinc-800">
            <Button
                variant="ghost"
                size="sm"
                class="w-full justify-start text-xs h-8"
                onclick={toggleAll}
            >
                {selected.length === options.length
                    ? "Deselect All"
                    : "Select All"}
            </Button>
        </div>
        <div class="max-h-[300px] overflow-y-auto p-1">
            {#each options as option}
                <div
                    class="flex items-center space-x-2 rounded-sm px-2 py-2 hover:bg-zinc-800/50 cursor-pointer"
                    role="button"
                    tabindex="0"
                    onclick={() => toggleOption(option)}
                    onkeydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleOption(option);
                        }
                    }}
                >
                    <Checkbox id={option} checked={selected.includes(option)} />
                    <label
                        for={option}
                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 truncate"
                    >
                        {option}
                    </label>
                </div>
            {/each}
        </div>
    </Popover.Content>
</Popover.Root>
