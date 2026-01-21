<script lang="ts">
    import * as Table from "$lib/components/ui/table";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Pencil } from "lucide-svelte";
    import EditableCell from "$lib/components/EditableCell.svelte";
    import type { Order, Column } from "$lib/types";
    import { getStatusColor } from "$lib/utils";
    import { Checkbox } from "$lib/components/ui/checkbox";

    let {
        order,
        visibleColumns,
        onEdit,
        onReceive,
        onRevert,
        onUpdate,
        rowClass = "",
        isSelected = false,
        onToggleSelect,
    } = $props<{
        order: Order;
        visibleColumns: Column[];
        onEdit: (order: Order) => void;
        onReceive: (id: string) => void;
        onRevert: (id: string) => void;
        onUpdate: (id: string, field: string, value: any) => Promise<void>;
        rowClass?: string;
        isSelected?: boolean;
        onToggleSelect?: (id: string) => void;
    }>();
</script>

<Table.Row
    class="border-zinc-800 hover:bg-zinc-800/30 {rowClass} {isSelected
        ? 'bg-zinc-800/80'
        : ''}"
>
    <Table.Cell class="w-[32px] px-1 text-center">
        <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(order.id)}
            class="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
        />
    </Table.Cell>
    {#each visibleColumns as col (col.id)}
        {#if col.id === "date_formatted"}
            <Table.Cell class="font-mono text-zinc-300">
                <EditableCell
                    value={order.order_date || order.created_at}
                    type="date"
                    onUpdate={(val) => onUpdate(order.id, "order_date", val)}
                />
            </Table.Cell>
        {:else if col.id === "description"}
            <Table.Cell class="overflow-hidden">
                <div class="font-medium text-zinc-200 truncate w-full">
                    <EditableCell
                        value={order.description}
                        class="truncate block w-full"
                        onUpdate={(val) =>
                            onUpdate(order.id, "description", val)}
                    />
                </div>
                <div class="text-xs text-zinc-500 font-mono mt-0.5">
                    <EditableCell
                        value={order.sku}
                        class="text-xs"
                        onUpdate={(val) => onUpdate(order.id, "sku", val)}
                    />
                </div>
            </Table.Cell>
        {:else if col.id === "provider"}
            <Table.Cell class="text-zinc-300 text-sm overflow-hidden">
                <EditableCell
                    value={order.provider}
                    class="truncate block w-full"
                    onUpdate={(val) => onUpdate(order.id, "provider", val)}
                />
            </Table.Cell>
        {:else if col.id === "price_formatted"}
            <Table.Cell class="text-zinc-300 text-sm text-right font-mono">
                <EditableCell
                    value={order.unit_price}
                    type="number"
                    onUpdate={(val) => onUpdate(order.id, "unit_price", val)}
                />
            </Table.Cell>
        {:else if col.id === "ordered_by"}
            <Table.Cell class="text-zinc-300 text-sm">
                <EditableCell
                    value={order.ordered_by}
                    onUpdate={(val) => onUpdate(order.id, "ordered_by", val)}
                />
            </Table.Cell>
        {:else if col.id === "project_code"}
            <Table.Cell class="text-zinc-400 font-mono text-xs">
                <EditableCell
                    value={order.project_code}
                    onUpdate={(val) => onUpdate(order.id, "project_code", val)}
                />
            </Table.Cell>
        {:else if col.id === "po_number"}
            <Table.Cell class="text-zinc-400 font-mono text-xs">
                <EditableCell
                    value={order.po_number}
                    onUpdate={(val) => onUpdate(order.id, "po_number", val)}
                />
            </Table.Cell>
        {:else if col.id === "quantity"}
            <Table.Cell class="text-center text-zinc-300">
                {#if order.quantity_received && order.quantity_received > 0 && order.quantity_received < order.quantity}
                    <div class="flex flex-col items-center leading-none">
                        <span class="text-xs text-sky-400 font-bold mb-0.5"
                            >{order.quantity_received} / {order.quantity}</span
                        >
                        <!-- Show total below as muted to indicate it's the target -->
                    </div>
                {:else}
                    <EditableCell
                        value={order.quantity}
                        type="integer"
                        onUpdate={(val) => onUpdate(order.id, "quantity", val)}
                    />
                {/if}
            </Table.Cell>
        {:else if col.id === "received_date"}
            <Table.Cell class="text-zinc-400 text-sm">
                <EditableCell
                    value={order.received_date}
                    type="date"
                    onUpdate={(val) => onUpdate(order.id, "received_date", val)}
                />
            </Table.Cell>
        {:else if col.id === "storage_location"}
            <Table.Cell class="text-zinc-200 text-sm">
                <EditableCell
                    value={order.storage_location}
                    onUpdate={(val) =>
                        onUpdate(order.id, "storage_location", val)}
                />
            </Table.Cell>
        {:else if col.id === "status"}
            <Table.Cell>
                <Badge
                    variant="outline"
                    class="{getStatusColor(
                        order.status,
                    )} border whitespace-nowrap {order.status === 'received' ||
                    order.status === 'partially_received'
                        ? 'cursor-pointer hover:opacity-80'
                        : ''}"
                    onclick={() =>
                        (order.status === "received" ||
                            order.status === "partially_received") &&
                        onRevert(order.id)}
                >
                    {order.status === "partially_received"
                        ? "Partial"
                        : order.status}
                </Badge>
            </Table.Cell>
        {:else if col.id === "actions"}
            <Table.Cell class="text-right">
                {#if order.status !== "received" && order.status !== "cancelled"}
                    <Button
                        size="sm"
                        variant="outline"
                        onclick={() => onReceive(order.id)}
                        class="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                    >
                        Receive
                    </Button>
                {/if}
                <Button
                    size="sm"
                    variant="ghost"
                    class="h-7 w-7 p-0 ml-1 text-zinc-400 hover:text-white"
                    onclick={() => onEdit(order)}
                >
                    <Pencil class="h-3.5 w-3.5" />
                </Button>
            </Table.Cell>
        {/if}
    {/each}
</Table.Row>
