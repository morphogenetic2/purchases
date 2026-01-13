<script lang="ts">
    import { dndzone, type DndEvent } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import { Button } from "$lib/components/ui/button";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Settings2, GripVertical } from "lucide-svelte";
    import * as Popover from "$lib/components/ui/popover";
    import type { OrderState } from "$lib/state/orderState.svelte";
    import type { Column } from "$lib/types";

    let { state: orderState } = $props<{ state: OrderState }>();

    // Local copy for dnd manipulation, synced
    let items = $state([...orderState.columns]);

    $effect(() => {
        // Only update if IDs don't match to avoid loop with dnd updates
        if (
            JSON.stringify(items.map((i) => i.id)) !==
                JSON.stringify(orderState.columns.map((c: Column) => c.id)) ||
            JSON.stringify(items.map((i) => i.visible)) !==
                JSON.stringify(orderState.columns.map((c: Column) => c.visible))
        ) {
            items = [...orderState.columns];
        }
    });

    function handleDndConsider(e: CustomEvent<DndEvent<Column>>) {
        items = e.detail.items;
    }

    function handleDndFinalize(e: CustomEvent<DndEvent<Column>>) {
        items = e.detail.items;
        orderState.updateColumns(items);
    }

    function toggleVisibility(id: string) {
        const newCols = items.map((c) =>
            c.id === id ? { ...c, visible: !c.visible } : c,
        );
        orderState.updateColumns(newCols);
    }
</script>

<Popover.Root>
    <Popover.Trigger>
        <Button
            variant="outline"
            size="sm"
            class="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
        >
            <Settings2 class="h-4 w-4 mr-2" /> Personalize columns
        </Button>
    </Popover.Trigger>
    <Popover.Content class="w-64 bg-zinc-950 border-zinc-800 p-0" align="end">
        <div class="p-4 border-b border-zinc-900">
            <h4 class="font-medium text-sm text-zinc-100">
                Personlize Columns
            </h4>
            <p class="text-xs text-zinc-500">Drag to reorder, check to show.</p>
        </div>
        <div
            use:dndzone={{ items, flipDurationMs: 300, dropTargetStyle: {} }}
            onconsider={handleDndConsider}
            onfinalize={handleDndFinalize}
            class="p-2 max-h-[300px] overflow-y-auto"
        >
            {#each items as item (item.id)}
                <div
                    animate:flip={{ duration: 300 }}
                    class="flex items-center gap-3 p-2 rounded hover:bg-zinc-900 group"
                >
                    <span
                        class="cursor-grab text-zinc-600 group-hover:text-zinc-400"
                    >
                        <GripVertical class="h-4 w-4" />
                    </span>
                    <Checkbox
                        checked={item.visible}
                        onCheckedChange={() => toggleVisibility(item.id)}
                        id={`col-${item.id}`}
                    />
                    <label
                        for={`col-${item.id}`}
                        class="text-sm text-zinc-300 flex-1 cursor-pointer select-none"
                    >
                        {item.label}
                    </label>
                </div>
            {/each}
        </div>
    </Popover.Content>
</Popover.Root>
