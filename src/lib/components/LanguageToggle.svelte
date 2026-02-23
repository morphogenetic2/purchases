<script lang="ts">
    import { locale, localeOptions, setLocale, t } from "$lib/i18n";
</script>

<div class="flex items-center gap-2">
    <span class="text-xs uppercase tracking-wide text-zinc-500">{$t("language.label")}</span>
    <div class="inline-flex rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
        {#each localeOptions as option}
            <button
                type="button"
                class="px-2 py-1 text-xs font-medium rounded transition-colors {option.value === $locale
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800'}"
                onclick={() => setLocale(option.value)}
                aria-label={`${$t("language.label")}: ${option.label}`}
            >
                {option.label}
            </button>
        {/each}
    </div>
</div>
