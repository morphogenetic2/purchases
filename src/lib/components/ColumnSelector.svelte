<script lang="ts">
    import { Button, buttonVariants } from "$lib/components/ui/button";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Settings2 } from "lucide-svelte";
    import * as Popover from "$lib/components/ui/popover";
    import type { OrderState } from "$lib/state/orderState.svelte";
    import type { Column } from "$lib/types";
    import { t } from "$lib/i18n";

    let { state: orderState } = $props<{ state: OrderState }>();

    const columnLabelKeyById: Record<string, string> = {
        date_formatted: "column.date_formatted",
        description: "column.description",
        provider: "column.provider",
        price_formatted: "column.price_formatted",
        ordered_by: "column.ordered_by",
        project_code: "column.project_code",
        po_number: "column.po_number",
        quantity: "column.quantity",
        received_date: "column.received_date",
        storage_location: "column.storage_location",
        status: "column.status",
        actions: "column.actions",
    };

    function toggleVisibility(id: string) {
        const newCols = orderState.columns.map((c: Column) =>
            c.id === id ? { ...c, visible: !c.visible } : c,
        );
        orderState.updateColumns(newCols);
    }

    function columnLabel(column: Column): string {
        const key = columnLabelKeyById[column.id];
        return key ? $t(key) : column.label;
    }
</script>

<Popover.Root>
    <Popover.Trigger
        class={buttonVariants({
            variant: "outline",
            size: "sm",
            class: "bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300",
        })}
    >
        <Settings2 class="h-4 w-4 mr-2" /> {$t("column.personalize")}
    </Popover.Trigger>
    <Popover.Content class="w-64 bg-zinc-950 border-zinc-800 p-0" align="end">
        <div class="p-4 border-b border-zinc-900">
            <h4 class="font-medium text-sm text-zinc-100">
                {$t("column.personalize_title")}
            </h4>
            <p class="text-xs text-zinc-500">{$t("column.personalize_description")}</p>
        </div>
        <div class="p-2 max-h-[300px] overflow-y-auto">
            {#each orderState.columns as item (item.id)}
                <div
                    class="flex items-center gap-3 p-2 rounded hover:bg-zinc-900 group"
                >
                    <Checkbox
                        checked={item.visible}
                        onCheckedChange={() => toggleVisibility(item.id)}
                        id={`col-${item.id}`}
                    />
                    <label
                        for={`col-${item.id}`}
                        class="text-sm text-zinc-300 flex-1 cursor-pointer select-none"
                    >
                        {columnLabel(item)}
                    </label>
                </div>
            {/each}
        </div>
    </Popover.Content>
</Popover.Root>
