<script lang="ts">
  import { orderService } from "$lib/services/orderService";
  import { invalidateAll } from "$app/navigation";
  import { Upload } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Label } from "$lib/components/ui/label";
  import * as Table from "$lib/components/ui/table";
  import * as Dialog from "$lib/components/ui/dialog";

  // Import the new Excel module
  import {
    DB_FIELDS,
    parseExcelBuffer,
    readFileAsBinaryString,
    transformExcelToOrders,
    validateOrders,
    formatValidationErrors,
    type ParseResult,
  } from "$lib/excel";
  import { PREDEFINED_ORDERED_BY } from "$lib/constants";

  let fileInput: HTMLInputElement;
  let parseResult = $state<ParseResult | null>(null);
  let mapping: Record<string, string> = $state({});
  let isFileSelectOpen = $state(false);
  let isMappingOpen = $state(false);
  let isUploading = $state(false);
  let forceNew = $state(false);
  let isDragging = $state(false);

  let { requesters = [] } = $props();

  let defaultOrderedBy = $state(PREDEFINED_ORDERED_BY[0]);
  let defaultOrderDate = $state(new Date().toISOString().split("T")[0]);

  // Combine predefined defaults with dynamic ones
  let requesterSuggestions = $derived(
    Array.from(new Set([...PREDEFINED_ORDERED_BY, ...requesters])).sort(),
  );

  // Derived values from parseResult
  let headers = $derived(parseResult?.headers ?? []);
  let previewData = $derived(parseResult?.previewData ?? []);

  async function processFile(file: File) {
    if (!file) return;

    try {
      const binaryString = await readFileAsBinaryString(file);
      parseResult = parseExcelBuffer(binaryString);
      mapping = { ...parseResult.autoMapping };
      forceNew = true;
      isFileSelectOpen = false; // Close file selection modal
      isMappingOpen = true; // Open mapping modal
    } catch (err) {
      console.error("Error parsing file:", err);
      alert("Error reading Excel file");
    }
  }

  async function handleFile(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      await processFile(file);
    }
    // Reset file input
    if (fileInput) fileInput.value = "";
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const file = e.dataTransfer?.files?.[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      await processFile(file);
    } else {
      alert("Please drop an Excel file (.xlsx or .xls)");
    }
  }

  async function handleUpload() {
    if (!parseResult) return;

    isUploading = true;
    let didUploadSucceed = false;

    try {
      // Transform Excel data to orders
      const { orders, skippedCount } = transformExcelToOrders(
        parseResult.allData,
        {
          mapping,
          defaultOrderedBy,
          defaultOrderDate,
          forceNew,
        },
      );

      // Validate orders
      const validation = validateOrders(orders);
      if (!validation.valid) {
        alert(formatValidationErrors(validation));
        return;
      }

      console.log(
        `Uploading ${orders.length} orders (skipped ${skippedCount} empty rows)`,
      );

      // Insert into database
      const { error } = await orderService.insertOrders(orders);
      if (error) throw error;

      alert("Success!");
      await invalidateAll();
      didUploadSucceed = true;
    } catch (err: any) {
      console.error("Upload Error:", err);
      alert("Error: " + (err.message || "Unknown error occurred"));
    } finally {
      isUploading = false;
      if (didUploadSucceed) {
        isMappingOpen = false;
        if (fileInput) fileInput.value = "";
      }
    }
  }
</script>

<div class="flex items-center gap-2">
  <input
    type="file"
    accept=".xlsx, .xls"
    onchange={handleFile}
    bind:this={fileInput}
    class="hidden"
  />
  <Button
    onclick={() => (isFileSelectOpen = true)}
    variant="outline"
    class="bg-zinc-900 text-zinc-300 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
  >
    <Upload class="mr-2 h-4 w-4" /> Import / Append Orders
  </Button>
</div>

<!-- File Selection Modal with Drag & Drop -->
<Dialog.Root bind:open={isFileSelectOpen}>
  <Dialog.Content
    class="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-zinc-100"
  >
    <Dialog.Header>
      <Dialog.Title>Import Orders</Dialog.Title>
      <Dialog.Description class="text-zinc-400">
        Drop your Excel file or browse to select
      </Dialog.Description>
    </Dialog.Header>

    <div class="py-8">
      <div
        role="button"
        tabindex="0"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={() => fileInput.click()}
        onkeydown={(e) => e.key === "Enter" && fileInput.click()}
        class="relative group cursor-pointer transition-all duration-300 ease-in-out rounded-lg border-2 border-dashed p-12 text-center
          {isDragging
          ? 'border-emerald-500 bg-emerald-950/40 scale-[1.02]'
          : 'border-zinc-700 bg-zinc-900/50 hover:border-emerald-600 hover:bg-zinc-900'}"
      >
        <!-- Gradient overlay on hover -->
        <div
          class="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-500/5 to-zinc-900/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        ></div>

        <div class="relative z-10 flex flex-col items-center gap-4">
          <!-- Icon with animation -->
          <div
            class="p-4 rounded-full bg-zinc-800/50 group-hover:bg-emerald-900/30 transition-all duration-300
            {isDragging ? 'bg-emerald-900/50 scale-110' : ''}"
          >
            <Upload
              class="h-10 w-10 text-zinc-400 group-hover:text-emerald-400 transition-colors duration-300
              {isDragging ? 'text-emerald-400 animate-bounce' : ''}"
            />
          </div>

          <!-- Primary text -->
          <div class="space-y-2">
            <p
              class="text-xl font-medium text-zinc-200 group-hover:text-white transition-colors duration-300"
            >
              {isDragging ? "Drop your file here" : "Drop Excel file here"}
            </p>
            <p
              class="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300"
            >
              or
            </p>
          </div>

          <!-- Browse button -->
          <Button
            variant="outline"
            class="relative bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-emerald-500 hover:bg-zinc-800 hover:text-emerald-400 transition-all duration-300
              {isDragging ? 'border-emerald-500 bg-zinc-800' : ''}"
            onclick={(e) => {
              e.stopPropagation();
              fileInput.click();
            }}
          >
            <Upload class="mr-2 h-4 w-4" />
            Click to Browse
          </Button>

          <!-- Supported formats -->
          <p class="text-xs text-zinc-600 mt-2">
            Supported formats: .xlsx, .xls
          </p>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<!-- Column Mapping Modal -->
<Dialog.Root bind:open={isMappingOpen}>
  <Dialog.Content
    class="sm:max-w-[800px] bg-zinc-900 border-zinc-800 text-zinc-100 p-0 overflow-hidden flex flex-col max-h-[90vh]"
  >
    <Dialog.Header class="p-6 pb-4">
      <Dialog.Title>Map Columns</Dialog.Title>
      <Dialog.Description class="text-zinc-400"
        >Map your Excel headers to the database fields.</Dialog.Description
      >
    </Dialog.Header>

    <div class="flex-1 overflow-y-auto px-6 py-2">
      <div
        class="mb-6 p-4 rounded-md bg-zinc-950 border border-zinc-800 flex items-center gap-3"
      >
        <Checkbox id="forceNew" bind:checked={forceNew} />
        <div class="flex flex-col">
          <Label for="forceNew" class="text-zinc-200 cursor-pointer"
            >New Order</Label
          >
          <span class="text-xs text-zinc-500"
            >Select this when adding a new weekly order</span
          >
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {#each DB_FIELDS as field}
          <div class="flex flex-col gap-2">
            <Label>{field.label} {field.required ? "*" : ""}</Label>
            <div class="flex gap-2">
              <select
                bind:value={mapping[field.key]}
                class="flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-100"
              >
                <option value="">-- Ignore / Default --</option>
                {#each headers as header}
                  <option value={header}>{header}</option>
                {/each}
              </select>

              <!-- Special handling for Ordered By default -->
              {#if field.key === "ordered_by" && !mapping["ordered_by"]}
                <Input
                  bind:value={defaultOrderedBy}
                  list="excel-requester-list"
                  class="w-[140px] rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
                <datalist id="excel-requester-list">
                  {#each requesterSuggestions as req}
                    <option value={req}></option>
                  {/each}
                </datalist>
              {/if}

              <!-- Special handling for Order Date default -->
              {#if field.key === "order_date" && !mapping["order_date"]}
                <input
                  type="date"
                  bind:value={defaultOrderDate}
                  class="w-[140px] rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="mb-4">
        <h4
          class="mb-2 font-semibold text-sm uppercase text-zinc-500 tracking-wider"
        >
          Preview
        </h4>
        <div class="rounded-md border border-zinc-800 overflow-x-auto">
          <Table.Root>
            <Table.Header>
              <Table.Row class="border-zinc-800 hover:bg-zinc-900">
                {#each DB_FIELDS as field}
                  <Table.Head class="text-zinc-400 whitespace-nowrap"
                    >{field.label}</Table.Head
                  >
                {/each}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each previewData as row}
                <Table.Row class="border-zinc-800 hover:bg-zinc-900/50">
                  {#each DB_FIELDS as field}
                    <Table.Cell class="font-mono text-xs whitespace-nowrap">
                      {mapping[field.key]
                        ? row[headers.indexOf(mapping[field.key])]
                        : "-"}
                    </Table.Cell>
                  {/each}
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    </div>

    <Dialog.Footer class="p-6 pt-4 border-t border-zinc-800">
      <Button
        variant="secondary"
        onclick={() => (isMappingOpen = false)}
        class="bg-zinc-800 text-zinc-100 hover:bg-zinc-700">Cancel</Button
      >
      <Button
        onclick={handleUpload}
        disabled={isUploading}
        class="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {#if isUploading}
          Uploading...
        {:else}
          Import Orders
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
