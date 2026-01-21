<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { ChevronLeft, ChevronRight } from "lucide-svelte";
    import { PAGINATION } from "$lib/constants";

    let {
        currentPage,
        totalPages,
        pageSize,
        totalItems,
        startItem,
        endItem,
        onPageChange,
        onPageSizeChange,
    } = $props<{
        currentPage: number;
        totalPages: number;
        pageSize: number;
        totalItems: number;
        startItem: number;
        endItem: number;
        onPageChange: (page: number) => void;
        onPageSizeChange: (size: number) => void;
    }>();

    // Use PAGE_SIZE_OPTIONS from constants if available, otherwise fallback
    const pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS;
</script>

<div
    class="flex items-center justify-between px-4 py-3 border-t border-zinc-800"
>
    <div class="text-sm text-zinc-500">
        Showing {startItem} to {endItem} of {totalItems} orders
    </div>
    <div class="flex items-center gap-4">
        <!-- Page Size Selector -->
        <div class="flex items-center gap-2">
            <span class="text-sm text-zinc-500">Per page:</span>
            <select
                class="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={pageSize}
                onchange={(e) =>
                    onPageSizeChange(Number(e.currentTarget.value))}
            >
                {#each pageSizeOptions as size}
                    <option value={size}>{size === 10000 ? "All" : size}</option
                    >
                {/each}
            </select>
        </div>

        <!-- Page Navigation -->
        <div class="flex items-center gap-1">
            <Button
                variant="outline"
                size="sm"
                class="h-8 w-8 p-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 disabled:opacity-50"
                disabled={currentPage <= 1}
                onclick={() => onPageChange(currentPage - 1)}
            >
                <ChevronLeft class="h-4 w-4" />
            </Button>
            <span class="text-sm text-zinc-300 px-3">
                Page {currentPage} of {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                class="h-8 w-8 p-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 disabled:opacity-50"
                disabled={currentPage >= totalPages}
                onclick={() => onPageChange(currentPage + 1)}
            >
                <ChevronRight class="h-4 w-4" />
            </Button>
        </div>
    </div>
</div>
