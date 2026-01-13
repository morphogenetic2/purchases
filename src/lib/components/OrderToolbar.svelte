<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Plus, Download } from "lucide-svelte";
    import ExcelIngestor from "$lib/components/ExcelIngestor.svelte";
    import WipeDbDialog from "./WipeDbDialog.svelte";

    let { onExport, onNewOrder, onWipe } = $props<{
        onExport: () => void;
        onNewOrder: () => void;
        onWipe: () => void; // Parent handles the reload/invalidate
    }>();

    let isWipeOpen = $state(false);
</script>

<div class="flex flex-col md:flex-row justify-between items-center gap-4">
    <div>
        <h1 class="text-3xl font-bold tracking-tight text-white mb-2">
            MiMe orders
        </h1>
        <p class="text-zinc-400">Manage orders</p>
    </div>
    <div class="flex items-center gap-2">
        <Button
            variant="destructive"
            size="sm"
            onclick={() => (isWipeOpen = true)}
        >
            Wipe DB
        </Button>

        <Button
            variant="outline"
            size="sm"
            onclick={onExport}
            class="bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
        >
            <Download class="mr-2 h-4 w-4" /> Export
        </Button>
        <ExcelIngestor />
        <Button
            onclick={onNewOrder}
            class="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
            <Plus class="mr-2 h-4 w-4" /> New Order
        </Button>
    </div>
</div>

<WipeDbDialog bind:open={isWipeOpen} {onWipe} />
