<script lang="ts">
  import {
    Globe,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    X,
  } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { orderService } from "$lib/services/orderService";
  import { addToast } from "$lib/state/toastState";
  import { invalidateAll } from "$app/navigation";
  import * as Dialog from "$lib/components/ui/dialog";
  import { t } from "$lib/i18n";
  import { cn } from "$lib/utils";

  // ─── Portal name → initials mapping ─────────────────────────────────────────
  let dbMappings = $state<Record<string, string>>({});

  async function loadMappings() {
    try {
      const resp = await fetch("/api/requesters");
      if (resp.ok) {
        const data = await resp.json();
        dbMappings = data.reduce((acc: any, curr: any) => {
          acc[curr.full_name] = curr.initials;
          return acc;
        }, {});
      }
    } catch (e) {
      console.error("Failed to load requester mappings", e);
    }
  }

  function resolveOrderedBy(portalName: string | null): string {
    if (!portalName) return "Unknown";

    // Check DB mappings first
    if (dbMappings[portalName]) return dbMappings[portalName];

    // Case-insensitive check
    const lower = portalName.toLowerCase();
    const found = Object.entries(dbMappings).find(
      ([k]) => k.toLowerCase() === lower,
    );
    if (found) return found[1];

    return portalName;
  }

  // ─── props ──────────────────────────────────────────────────────────────────
  let { requesters = [] } = $props<{ requesters?: string[] }>();

  // ─── state ──────────────────────────────────────────────────────────────────
  let open = $state(false);
  let step = $state<"credentials" | "preview" | "importing" | "done" | "empty">(
    "credentials",
  );

  // credentials form
  let username = $state("");
  let password = $state("");
  let rememberCredentials = $state(false);
  let selectedPage = $state<"Delivery" | "Pending" | "Shop">("Delivery");

  // fetch state
  let loading = $state(false);
  let errorMsg = $state<string | null>(null);

  // scraped data
  type ScrapedRow = {
    project_code: string | null;
    order_date: string | null;
    po_number: string | null;
    provider: string;
    sku: string | null;
    description: string;
    quantity: number;
    price: number | null;
    ordered_by: string | null;
  };
  let scrapedRows = $state<ScrapedRow[]>([]);
  let selectedRows = $state<Set<number>>(new Set());
  let emptyReason = $state<string | null>(null);

  // ─── lifecycle ──────────────────────────────────────────────────────────────
  $effect(() => {
    if (open) {
      step = "credentials";
      errorMsg = null;
      scrapedRows = [];
      selectedRows = new Set();
      emptyReason = null;
      loadMappings();
      if (!rememberCredentials) {
        username = "";
        password = "";
      }
    }
  });

  import { onMount } from "svelte";
  onMount(() => {
    loadMappings();
  });

  // ─── actions ────────────────────────────────────────────────────────────────
  async function fetchFromPortal() {
    if (!username.trim() || !password.trim()) {
      errorMsg = "Username and password are required.";
      return;
    }
    errorMsg = null;
    loading = true;

    try {
      const resp = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          page: selectedPage,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        errorMsg =
          data?.message ?? `Error ${resp.status}: could not connect to portal`;
        return;
      }

      scrapedRows = data.orders ?? [];
      if (data.empty || scrapedRows.length === 0) {
        emptyReason = data.emptyReason ?? "No orders found in this section.";
        step = "empty";
        return;
      }

      // Pre-select all rows
      selectedRows = new Set(scrapedRows.map((_, i) => i));
      step = "preview";
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : "Unexpected network error";
    } finally {
      loading = false;
    }
  }

  function toggleRow(i: number) {
    const next = new Set(selectedRows);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    selectedRows = next;
  }

  function toggleAll() {
    if (selectedRows.size === scrapedRows.length) {
      selectedRows = new Set();
    } else {
      selectedRows = new Set(scrapedRows.map((_, i) => i));
    }
  }

  async function importSelected() {
    const rows = scrapedRows.filter((_, i) => selectedRows.has(i));
    if (rows.length === 0) return;

    step = "importing";
    errorMsg = null;

    // Map ScrapedRow → Order insert shape
    const orders = rows.map((r) => ({
      description: r.description || r.sku || "(no description)",
      provider: r.provider,
      ordered_by:
        selectedPage === "Shop"
          ? resolveOrderedBy(username)
          : resolveOrderedBy(r.ordered_by),
      sku: r.sku ?? undefined,
      project_code: r.project_code ?? undefined,
      po_number: r.po_number ?? undefined,
      order_date: r.order_date ?? undefined,
      quantity: r.quantity,
      price: r.price ?? undefined,
      status: selectedPage === "Shop" ? "requested" : "ordered",
    }));

    try {
      await orderService.insertOrders(orders);
      await invalidateAll();
      const n = orders.length;
      addToast(
        $t(n === 1 ? "portal.toast_success" : "portal.toast_success_plural", {
          count: n,
        }),
        "success",
      );
      step = "done";
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : "Import failed";
      step = "preview";
    }
  }
</script>

<!-- Trigger button -->
<Button
  variant="outline"
  size="sm"
  onclick={() => (open = true)}
  class="bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
>
  <Globe class="mr-2 h-4 w-4" />
  {$t("portal.button")}
</Button>

<Dialog.Root bind:open>
  <Dialog.Content
    class={cn(
      "bg-zinc-900 border-zinc-700 text-zinc-100 max-h-[90vh] overflow-y-auto transition-all duration-300 ease-in-out",
      step === "preview"
        ? "sm:max-w-[95vw] lg:max-w-[1024px] xl:max-w-[1200px] w-full"
        : "sm:max-w-lg w-[95vw]",
    )}
  >
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 text-xl font-semibold">
        <Globe class="h-5 w-5 text-emerald-400" />
        {#if step === "credentials"}
          {$t("portal.connect_title")}
        {:else if step === "preview"}
          {$t(
            scrapedRows.length === 1
              ? "portal.preview_title"
              : "portal.preview_title_plural",
            { count: scrapedRows.length },
          )}
        {:else if step === "importing"}
          {$t("portal.importing_title")}
        {:else if step === "empty"}
          {$t("portal.empty_title")}
        {:else}
          {$t("portal.done_title")}
        {/if}
      </Dialog.Title>
      <Dialog.Description class="text-zinc-400 text-sm">
        {#if step === "credentials"}
          {$t("portal.connect_description")}
        {:else if step === "preview"}
          {$t("portal.preview_description")}
        {:else if step === "importing"}
          {$t("portal.importing_description")}
        {:else if step === "empty"}
          {$t("portal.empty_description")}
        {:else}
          {$t("portal.done_description")}
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <!-- ── STEP: credentials ────────────────────────────────────────────── -->
    {#if step === "credentials"}
      <div class="flex flex-col gap-4 mt-2">
        <div class="flex flex-col gap-1.5">
          <label
            class="text-sm font-medium text-zinc-300"
            for="portal-username"
          >
            {$t("portal.username")}
          </label>
          <input
            id="portal-username"
            type="text"
            autocomplete="username"
            bind:value={username}
            placeholder="your.username"
            class="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-sm font-medium text-zinc-300"
            for="portal-password"
          >
            {$t("portal.password")}
          </label>
          <input
            id="portal-password"
            type="password"
            autocomplete="current-password"
            bind:value={password}
            placeholder="••••••••"
            onkeydown={(e) => {
              if (e.key === "Enter") fetchFromPortal();
            }}
            class="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-zinc-300" for="portal-page">
            {$t("portal.target_page")}
          </label>
          <select
            id="portal-page"
            bind:value={selectedPage}
            class="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Delivery">{$t("portal.page_delivery")}</option>
            <option value="Pending">{$t("portal.page_pending")}</option>
            <option value="Shop">{$t("portal.page_shop")}</option>
          </select>
        </div>

        <label
          class="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none"
        >
          <input
            type="checkbox"
            bind:checked={rememberCredentials}
            class="rounded accent-emerald-500"
          />
          {$t("portal.remember")}
        </label>

        {#if errorMsg}
          <div
            class="flex items-start gap-2 rounded-md bg-red-900/40 border border-red-700 p-3 text-sm text-red-300"
          >
            <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
            {errorMsg}
          </div>
        {/if}
      </div>

      <Dialog.Footer class="mt-4 flex justify-end gap-2">
        <Button
          variant="ghost"
          onclick={() => (open = false)}
          class="text-zinc-400 hover:text-zinc-100"
        >
          {$t("common.cancel")}
        </Button>
        <Button
          onclick={fetchFromPortal}
          disabled={loading}
          class="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
        >
          {#if loading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {$t("portal.fetching")}
          {:else}
            <ArrowRight class="mr-2 h-4 w-4" />
            {$t("portal.fetch")}
          {/if}
        </Button>
      </Dialog.Footer>

      <!-- ── STEP: preview ─────────────────────────────────────────────────── -->
    {:else if step === "preview"}
      <div class="flex flex-col gap-3 mt-2">
        <!-- Selection controls -->
        <div class="flex items-center justify-between text-sm text-zinc-400">
          <button
            onclick={toggleAll}
            class="underline underline-offset-2 hover:text-zinc-100 transition-colors"
          >
            {selectedRows.size === scrapedRows.length
              ? $t("portal.deselect_all")
              : $t("portal.select_all")}
          </button>
          <span
            >{$t("portal.selected_count", {
              selected: selectedRows.size,
              total: scrapedRows.length,
            })}</span
          >
        </div>

        <!-- Table -->
        <div
          class="overflow-auto max-h-[55vh] rounded-md border border-zinc-700"
        >
          <table class="w-full text-xs">
            <thead
              class="sticky top-0 bg-zinc-800 text-zinc-400 uppercase tracking-wider"
            >
              <tr>
                <th class="px-2 py-2 w-8"></th>
                <th class="px-3 py-2 text-left">{$t("portal.col_project")}</th>
                <th class="px-3 py-2 text-left">{$t("portal.col_supplier")}</th>
                <th class="px-3 py-2 text-left">{$t("portal.col_sku")}</th>
                <th class="px-3 py-2 text-left"
                  >{$t("portal.col_description")}</th
                >
                <th class="px-3 py-2 text-center">{$t("portal.col_qty")}</th>
                {#if selectedPage === "Shop"}
                  <th class="px-3 py-2 text-right">{$t("portal.col_price")}</th>
                {:else}
                  <th class="px-3 py-2 text-left">{$t("portal.col_date")}</th>
                {/if}
                <th class="px-3 py-2 text-left"
                  >{$t("portal.col_requested_by")}</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
              {#each scrapedRows as row, i}
                <tr
                  class="transition-colors cursor-pointer {selectedRows.has(i)
                    ? 'bg-zinc-900'
                    : 'bg-zinc-950 opacity-50'} hover:bg-zinc-800"
                  onclick={() => toggleRow(i)}
                >
                  <td class="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(i)}
                      onclick={(e) => e.stopPropagation()}
                      onchange={() => toggleRow(i)}
                      class="accent-emerald-500"
                    />
                  </td>
                  <td class="px-3 py-2 text-zinc-300 font-mono"
                    >{row.project_code ?? "—"}</td
                  >
                  <td
                    class="px-3 py-2 text-zinc-200 max-w-[140px] truncate"
                    title={row.provider}>{row.provider}</td
                  >
                  <td
                    class="px-3 py-2 text-emerald-400 font-mono whitespace-nowrap"
                    >{row.sku ?? "—"}</td
                  >
                  <td
                    class="px-3 py-2 text-zinc-300 max-w-[200px] truncate"
                    title={row.description}>{row.description || "—"}</td
                  >
                  <td class="px-3 py-2 text-center text-zinc-200"
                    >{row.quantity}</td
                  >
                  {#if selectedPage === "Shop"}
                    <td
                      class="px-3 py-2 text-right text-zinc-200 whitespace-nowrap"
                    >
                      {#if row.price !== null}
                        {row.price.toFixed(2)}€
                      {:else}
                        —
                      {/if}
                    </td>
                  {:else}
                    <td class="px-3 py-2 text-zinc-500 whitespace-nowrap"
                      >{row.order_date ?? "—"}</td
                    >
                  {/if}
                  <td class="px-3 py-2 text-zinc-400 whitespace-nowrap"
                    >{selectedPage === "Shop"
                      ? username
                      : (row.ordered_by ?? "—")}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if errorMsg}
          <div
            class="flex items-start gap-2 rounded-md bg-red-900/40 border border-red-700 p-3 text-sm text-red-300"
          >
            <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
            {errorMsg}
          </div>
        {/if}
      </div>

      <Dialog.Footer class="mt-4 flex justify-between gap-2">
        <Button
          variant="ghost"
          onclick={() => (step = "credentials")}
          class="text-zinc-400 hover:text-zinc-100"
        >
          {$t("portal.back")}
        </Button>
        <div class="flex gap-2">
          <Button
            variant="ghost"
            onclick={() => (open = false)}
            class="text-zinc-400 hover:text-zinc-100"
          >
            {$t("common.cancel")}
          </Button>
          <Button
            onclick={importSelected}
            disabled={selectedRows.size === 0}
            class="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px]"
          >
            {$t(
              selectedRows.size === 1
                ? "portal.import_orders"
                : "portal.import_orders_plural",
              { count: selectedRows.size },
            )}
          </Button>
        </div>
      </Dialog.Footer>

      <!-- ── STEP: importing ───────────────────────────────────────────────── -->
    {:else if step === "importing"}
      <div class="flex flex-col items-center gap-4 py-8 text-zinc-400">
        <Loader2 class="h-10 w-10 animate-spin text-emerald-400" />
        <p class="text-sm">{$t("portal.importing_description")}</p>
      </div>

      <!-- ── STEP: done ────────────────────────────────────────────────────── -->
    {:else if step === "done"}
      <div class="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 class="h-12 w-12 text-emerald-400" />
        <p class="text-zinc-200 font-medium">{$t("portal.done_description")}</p>
      </div>
      <Dialog.Footer>
        <Button
          onclick={() => (open = false)}
          class="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <X class="mr-2 h-4 w-4" />
          {$t("portal.done_close")}
        </Button>
      </Dialog.Footer>
      <!-- ── STEP: empty ────────────────────────────────────────────────────── -->
    {:else if step === "empty"}
      <div class="flex flex-col items-center gap-4 py-10 text-center">
        <div class="rounded-full bg-zinc-800 p-4">
          <Globe class="h-10 w-10 text-zinc-500" />
        </div>
        <div>
          <p class="text-zinc-200 font-medium text-base">
            {$t("portal.empty_title")}
          </p>
          <p class="text-zinc-500 text-sm mt-1 max-w-xs mx-auto">
            {emptyReason ?? $t("portal.empty_description")}
          </p>
        </div>
      </div>
      <Dialog.Footer class="flex justify-between gap-2">
        <Button
          variant="outline"
          onclick={() => (step = "credentials")}
          class="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          {$t("portal.back")}
        </Button>
        <Button
          onclick={() => (open = false)}
          class="bg-zinc-700 hover:bg-zinc-600 text-white"
        >
          {$t("portal.done_close")}
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
