<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { supabase } from "$lib/supabaseClient";
    import { invalidateAll } from "$app/navigation";

    let {
        orderId,
        field,
        value,
        type = "text",
        class: className = "",
    } = $props<{
        orderId: string;
        field: string;
        value: string | number | null;
        type?: "text" | "number";
        class?: string;
    }>();

    let isEditing = $state(false);
    let editValue = $state(String(value ?? ""));
    let isSaving = $state(false);
    let inputRef = $state<HTMLInputElement | null>(null);

    function startEditing() {
        editValue = String(value ?? "");
        isEditing = true;
    }

    // Focus the input when editing starts
    $effect(() => {
        if (isEditing && inputRef) {
            inputRef.focus();
            inputRef.select();
        }
    });

    async function save() {
        if (isSaving) return;

        // Check if value actually changed
        const newValue =
            type === "number"
                ? editValue === ""
                    ? null
                    : parseFloat(editValue)
                : editValue.trim() === ""
                  ? null
                  : editValue.trim();

        const oldValue = value;

        if (newValue === oldValue || (newValue === null && oldValue === null)) {
            isEditing = false;
            return;
        }

        isSaving = true;

        try {
            const { error } = await supabase
                .from("orders")
                .update({ [field]: newValue })
                .eq("id", orderId);

            if (error) {
                console.error("Error saving:", error);
                alert("Failed to save: " + error.message);
            } else {
                await invalidateAll();
            }
        } catch (err: any) {
            console.error("Error saving:", err);
            alert("Failed to save: " + err.message);
        } finally {
            isSaving = false;
            isEditing = false;
        }
    }

    function cancel() {
        editValue = String(value ?? "");
        isEditing = false;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            save();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
        }
    }

    function handleBlur() {
        // Small delay to allow click events to register first
        setTimeout(() => {
            if (isEditing && !isSaving) {
                save();
            }
        }, 100);
    }
</script>

{#if isEditing}
    <Input
        bind:ref={inputRef}
        {type}
        step={type === "number" ? "0.01" : undefined}
        value={editValue}
        oninput={(e) => (editValue = e.currentTarget.value)}
        onkeydown={handleKeydown}
        onblur={handleBlur}
        disabled={isSaving}
        class="h-7 text-sm bg-zinc-900 border-zinc-600 focus:border-emerald-500 {className}"
    />
{:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
        ondblclick={startEditing}
        onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                startEditing();
            }
        }}
        role="button"
        tabindex="0"
        class="cursor-text hover:bg-zinc-800/50 px-1 py-0.5 -mx-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/50 {className}"
        title="Double-click to edit"
    >
        {value ?? "-"}
    </span>
{/if}
