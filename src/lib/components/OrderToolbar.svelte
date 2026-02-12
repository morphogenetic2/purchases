<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Plus, Download } from "lucide-svelte";
  import ExcelIngestor from "$lib/components/ExcelIngestor.svelte";

  let {
    onExport,
    onNewOrder,
    requesters = [],
  } = $props<{
    onExport: () => void;
    onNewOrder: () => void;
    requesters: string[];
  }>();
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
      variant="outline"
      size="sm"
      onclick={onExport}
      class="bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
    >
      <Download class="mr-2 h-4 w-4" /> Export
    </Button>
    <ExcelIngestor {requesters} />
    <Button
      onclick={onNewOrder}
      class="bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      <Plus class="mr-2 h-4 w-4" /> New Order
    </Button>
  </div>
</div>
