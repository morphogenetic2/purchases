<script lang="ts">
    import * as XLSX from "xlsx";
    import { orderService } from "$lib/services/orderService";
    import { invalidateAll } from "$app/navigation";
    import { Upload } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { Checkbox } from "$lib/components/ui/checkbox";

    import { Label } from "$lib/components/ui/label";
    import * as Table from "$lib/components/ui/table";
    import * as Dialog from "$lib/components/ui/dialog";

    let fileInput: HTMLInputElement;
    let previewData: any[] = $state([]);
    let headers: string[] = $state([]);
    let mapping: Record<string, string> = $state({});
    let isOpen = $state(false);
    let isUploading = $state(false);
    let forceNew = $state(false); // Default false, user can enable

    const predefinedOrderedBy = ["ARN", "MA", "FM", "DA"];
    let defaultOrderedBy = $state(predefinedOrderedBy[0]);
    let defaultOrderDate = $state(new Date().toISOString().split("T")[0]);

    const dbFields = [
        { key: "order_date", label: "Order Date" },
        { key: "ordered_by", label: "Ordered By", required: true },
        { key: "provider", label: "Provider", required: true },
        { key: "sku", label: "SKU" },
        { key: "description", label: "Description", required: true },
        { key: "quantity", label: "Quantity" },
        { key: "unit_price", label: "Unit Price" },
        { key: "project_code", label: "Project Code" },
        { key: "po_number", label: "PO Number" },
        { key: "received_date", label: "Received Date" },
        { key: "storage_location", label: "Storage Location" },
        { key: "is_received", label: "Received?" },
    ];

    function handleFile(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (data.length > 0) {
                headers = data[0] as string[];
                previewData = data.slice(1, 6);
                // Auto-map if headers match keys
                dbFields.forEach((field) => {
                    const match = headers.find(
                        (h) =>
                            h.toLowerCase() === field.key.toLowerCase() ||
                            h.toLowerCase() === field.label.toLowerCase(),
                    );
                    if (match) mapping[field.key] = match;
                });

                // Reset to default
                forceNew = false;
                isOpen = true; // Open dialog to confirm mapping
            }
        };
        reader.readAsBinaryString(file);
    }

    async function handleUpload() {
        isUploading = true;

        const file = fileInput.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws);

                const rowsToInsert = jsonData.map((row: any) => {
                    const newRow: any = {};
                    dbFields.forEach((field) => {
                        const excelHeader = mapping[field.key];
                        if (excelHeader) {
                            let val = row[excelHeader];
                            if (typeof val === "string") val = val.trim();

                            if (field.key === "sku" && val)
                                val = String(val).toUpperCase();
                            if (field.key === "unit_price")
                                val = parseFloat(val) || 0;
                            if (field.key === "quantity")
                                val = parseInt(val) || 1;

                            // Date Handling
                            if (field.key.includes("date") && val) {
                                // If it's a number (Excel serial date), convert it
                                if (typeof val === "number") {
                                    // Excel serial date to JS Date: (val - 25569) * 86400 * 1000
                                    // Adjust for timezone offset to keep it as "local" date string YYYY-MM-DD
                                    const date = new Date(
                                        (val - 25569) * 86400 * 1000,
                                    );
                                    val = date.toISOString().split("T")[0];
                                }
                                // If it is already a string, try to ensure it's YYYY-MM-DD?
                                // For now, trust the string or the number conversion.
                                else if (typeof val === "string") {
                                    // Basic cleanup if needed, but let's assume ISO or valid string for now
                                    // If it's something like "12/31/2025", we might want to standardize
                                    const d = new Date(val);
                                    if (!isNaN(d.getTime())) {
                                        val = d.toISOString().split("T")[0];
                                    }
                                }
                            }

                            // Check "Received?" column for Yes/No
                            if (field.key === "is_received") {
                                if (
                                    typeof val === "string" &&
                                    val.toLowerCase().includes("yes")
                                ) {
                                    val = true;
                                    newRow.status = "received";
                                } else {
                                    val = false; // Default or if "No" / blank
                                }
                            }

                            newRow[field.key] = val;
                        } else if (field.key === "ordered_by" && !excelHeader) {
                            // Use default if no mapping for ordered_by
                            newRow["ordered_by"] = defaultOrderedBy;
                        } else if (field.key === "order_date" && !excelHeader) {
                            // Use default date if no mapping
                            newRow["order_date"] = defaultOrderDate;
                        }
                    });

                    // Force New Order overrides
                    if (forceNew) {
                        newRow.status = "requested";
                        newRow.is_received = false;
                        newRow.received_date = null;
                        // Removing ID is usually implicit since we construct newRow from scratch
                        // but if we were mapping an "id" column, we should delete it here to force insert
                        delete newRow.id;
                    } else if (!newRow.status) {
                        // Default status if not marked as received
                        newRow.status = "requested";
                    }

                    return newRow;
                });

                // Filter out empty rows (missing ALL required fields)
                // If a row lacks all required fields (Ordered By, Provider, Description), we assume it's a blank line.
                const validRows = rowsToInsert.filter((row: any) => {
                    const requiredFields = dbFields.filter((f) => f.required);
                    return requiredFields.some((f) => !!row[f.key]);
                });

                // Validation Loop
                for (let i = 0; i < validRows.length; i++) {
                    const row = validRows[i];
                    const missing: string[] = [];

                    dbFields.forEach((f) => {
                        if (f.required && !row[f.key]) {
                            missing.push(f.label);
                        }
                    });

                    if (missing.length > 0) {
                        // We can't easily map back to original Excel row number after filtering,
                        // but standard practice is usually acceptable or we could track index.
                        // For now, simple alert is better than crashing or blocking on blank lines.
                        alert(
                            `Error in Order "${row.description || "Unknown"}": Missing required fields: ${missing.join(", ")}.`,
                        );
                        return; // Stop upload
                    }
                }

                console.log("Attempting to upload rows:", validRows.length);

                const { error } = await orderService.insertOrders(validRows);

                if (error) throw error;

                alert("Success!");
                await invalidateAll();
            } catch (err: any) {
                console.error("Upload Error:", err);
                alert("Error: " + (err.message || "Unknown error occurred"));
            } finally {
                isUploading = false;
                isOpen = false;
                if (fileInput) fileInput.value = ""; // Reset input
            }
        };
        reader.readAsBinaryString(file);
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
                {#each dbFields as field}
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
                                    {#each predefinedOrderedBy as val}
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
                                {#each dbFields as field}
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
                                    {#each dbFields as field}
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
