<script lang="ts">
    import { toasts, removeToast } from "$lib/state/toastState";
</script>

<div class="fixed top-4 right-4 z-[200] space-y-2 w-[320px] max-w-[calc(100vw-2rem)]">
    {#each $toasts as toast (toast.id)}
        <div
            class="rounded-md border p-3 shadow-lg backdrop-blur-sm flex items-start gap-2 {toast.type ===
            'success'
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
                : toast.type === 'error'
                  ? 'bg-red-950/95 border-red-500/40 text-red-100'
                  : 'bg-zinc-900/95 border-zinc-700 text-zinc-100'}"
        >
            <p class="text-sm flex-1 leading-5">{toast.message}</p>
            <button
                type="button"
                class="text-xs opacity-70 hover:opacity-100 transition-opacity"
                onclick={() => removeToast(toast.id)}
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    {/each}
</div>
