<script lang="ts">
    import { orderService } from "$lib/services/orderService";
    import { invalidateAll } from "$app/navigation";
    import { Upload } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
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
    let isOpen = $state(false);
    let isUploading = $state(false);
    let forceNew = $state(false);

    let defaultOrderedBy = $state(PREDEFINED_ORDERED_BY[0]);
    let defaultOrderDate = $state(new Date().toISOString().split("T")[0]);

    // Derived values from parseResult
    let headers = $derived(parseResult?.headers ?? []);
    let previewData = $derived(parseResult?.previewData ?? []);

    async function handleFile(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        try {
            const binaryString = await readFileAsBinaryString(file);
            parseResult = parseExcelBuffer(binaryString);
            mapping = { ...parseResult.autoMapping };
            forceNew = false;
            isOpen = true;
        } catch (err) {
            console.error("Error parsing file:", err);
            alert("Error reading Excel file");
        }
    }

    async function handleUpload() {
        if (!parseResult) return;

        isUploading = true;

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
        } catch (err: any) {
            console.error("Upload Error:", err);
            alert("Error: " + (err.message || "Unknown error occurred"));
        } finally {
            isUploading = false;
            isOpen = false;
            if (fileInput) fileInput.value = "";
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
        onclick={() => fileInput.click()}
        variant="outline"
        class="bg-zinc-900 text-zinc-300 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
    >
        <Upload class="mr-2 h-4 w-4" /> Import / Append Orders
    </Button>
</div>

<Dialog.Root bind:open={isOpen}>
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
                                <select
                                    bind:value={defaultOrderedBy}
                                    class="w-[100px] rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                                >
                                    {#each PREDEFINED_ORDERED_BY as val}
                                        <option value={val}>{val}</option>
                                    {/each}
                                </select>
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
                            <Table.Row
                                class="border-zinc-800 hover:bg-zinc-900"
                            >
                                {#each DB_FIELDS as field}
                                    <Table.Head
                                        class="text-zinc-400 whitespace-nowrap"
                                        >{field.label}</Table.Head
                                    >
                                {/each}
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each previewData as row}
                                <Table.Row
                                    class="border-zinc-800 hover:bg-zinc-900/50"
                                >
                                    {#each DB_FIELDS as field}
                                        <Table.Cell
                                            class="font-mono text-xs whitespace-nowrap"
                                        >
                                            {mapping[field.key]
                                                ? row[
                                                      headers.indexOf(
                                                          mapping[field.key],
                                                      )
                                                  ]
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
                onclick={() => (isOpen = false)}
                class="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                >Cancel</Button
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
