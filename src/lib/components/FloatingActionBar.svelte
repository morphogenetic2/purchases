<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Trash2, Download, X, CheckCircle } from "lucide-svelte";
    import { fly } from "svelte/transition";

    let { count, onClear, onReceive, onDelete, onExport } = $props<{
        count: number;
        onClear: () => void;
        onReceive: () => void;
        onDelete: () => void;
        onExport: () => void;
    }>();
</script>

{#if count > 0}
    <div
        transition:fly={{ y: 50, duration: 200 }}
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 shadow-2xl shadow-emerald-900/50 rounded-full px-4 py-2"
    >
        <div
            class="flex items-center gap-2 border-r border-emerald-500/30 pr-4 mr-2"
        >
            <span class="text-sm font-medium text-emerald-100"
                >{count} selected</span
            >
            <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 rounded-full hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-100"
                onclick={onClear}
            >
                <X class="h-3 w-3" />
            </Button>
        </div>

        <Button
            size="sm"
            variant="ghost"
            class="h-8 text-emerald-300 hover:text-emerald-100 hover:bg-emerald-900/50"
            onclick={onReceive}
        >
            <CheckCircle class="mr-2 h-4 w-4" /> Receive
        </Button>
        <Button
            size="sm"
            variant="ghost"
            class="h-8 text-emerald-300 hover:text-white hover:bg-emerald-900/50"
            onclick={onExport}
        >
            <Download class="mr-2 h-4 w-4" /> Export
        </Button>
        <Button
            size="sm"
            variant="ghost"
            class="h-8 text-red-400 hover:text-red-300 hover:bg-red-950/50"
            onclick={onDelete}
        >
            <Trash2 class="mr-2 h-4 w-4" /> Delete
        </Button>
    </div>
{/if}
