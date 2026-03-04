<script lang="ts">
  import { Users, Plus, Trash2, Loader2, UserPlus, X } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { addToast } from "$lib/state/toastState";
  import { t } from "$lib/i18n";
  import { onMount } from "svelte";

  let open = $state(false);
  let loading = $state(false);
  let requesters = $state<
    Array<{ id: string; full_name: string; initials: string }>
  >([]);

  // Form state
  let newFullName = $state("");
  let newInitials = $state("");
  let saving = $state(false);

  async function loadRequesters() {
    loading = true;
    try {
      const resp = await fetch("/api/requesters");
      if (resp.ok) {
        requesters = await resp.json();
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function addRequester() {
    if (!newFullName.trim() || !newInitials.trim()) return;

    saving = true;
    try {
      const resp = await fetch("/api/requesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newFullName.trim(),
          initials: newInitials.trim().toUpperCase(),
        }),
      });

      if (resp.ok) {
        const newUser = await resp.json();
        requesters = [...requesters, newUser].sort((a, b) =>
          a.full_name.localeCompare(b.full_name),
        );
        newFullName = "";
        newInitials = "";
        addToast($t("users.toast_add"), "success");
      } else {
        const err = await resp.json();
        addToast(err.message || $t("users.toast_error"), "error");
      }
    } catch (e) {
      addToast($t("users.toast_error"), "error");
    } finally {
      saving = false;
    }
  }

  async function deleteRequester(id: string) {
    try {
      const resp = await fetch("/api/requesters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (resp.ok) {
        requesters = requesters.filter((r) => r.id !== id);
        addToast($t("users.toast_delete"), "success");
      }
    } catch (e) {
      addToast($t("users.toast_error"), "error");
    }
  }

  onMount(() => {
    if (open) loadRequesters();
  });

  $effect(() => {
    if (open) loadRequesters();
  });
</script>

<Button
  variant="outline"
  size="sm"
  onclick={() => (open = true)}
  class="bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
>
  <Users class="mr-2 h-4 w-4" />
  {$t("users.button")}
</Button>

<Dialog.Root bind:open>
  <Dialog.Content class="bg-zinc-900 border-zinc-700 text-zinc-100 sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Users class="h-5 w-5 text-emerald-400" />
        {$t("users.title")}
      </Dialog.Title>
      <Dialog.Description class="text-zinc-400">
        {$t("users.description")}
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4 mt-4">
      <!-- Add section -->
      <div
        class="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {$t("users.add_title")}
        </p>
        <div class="grid grid-cols-4 gap-2">
          <input
            type="text"
            placeholder={$t("users.full_name_placeholder")}
            bind:value={newFullName}
            class="col-span-2 rounded bg-zinc-800 border-zinc-700 px-2 py-1.5 text-sm placeholder:text-zinc-500"
          />
          <input
            type="text"
            placeholder={$t("users.initials_placeholder")}
            bind:value={newInitials}
            maxlength="4"
            class="col-span-1 rounded bg-zinc-800 border-zinc-700 px-2 py-1.5 text-sm uppercase placeholder:text-zinc-500"
          />
          <Button
            size="sm"
            onclick={addRequester}
            disabled={saving || !newFullName || !newInitials}
            class="bg-emerald-600 hover:bg-emerald-700 h-auto"
          >
            {#if saving}
              <Loader2 class="h-4 w-4 animate-spin" />
            {:else}
              <Plus class="h-4 w-4" />
            {/if}
          </Button>
        </div>
      </div>

      <!-- List section -->
      <div class="max-h-[300px] overflow-y-auto space-y-1 pr-1">
        {#if loading}
          <div class="flex justify-center py-8">
            <Loader2 class="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        {:else if requesters.length === 0}
          <p class="text-center py-8 text-sm text-zinc-500 italic">
            {$t("users.empty")}
          </p>
        {:else}
          {#each requesters as req (req.id)}
            <div
              class="flex items-center justify-between p-2 rounded hover:bg-zinc-800 transition-colors group"
            >
              <div class="flex flex-col">
                <span class="text-sm font-medium text-zinc-200"
                  >{req.full_name}</span
                >
                <span class="text-xs text-zinc-500 font-mono tracking-tight"
                  >{req.initials}</span
                >
              </div>
              <button
                onclick={() => deleteRequester(req.id)}
                class="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="ghost" onclick={() => (open = false)}
        >{$t("portal.done_close")}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
