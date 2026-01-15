<script lang="ts">
    import { Input } from "$lib/components/ui/input";

    let {
        value,
        type = "text",
        class: className = "",
        onUpdate,
    } = $props<{
        value: string | number | null;
        type?: "text" | "number" | "integer" | "date";
        class?: string;
        onUpdate: (newValue: string | number | null) => Promise<void>;
    }>();

    let isEditing = $state(false);
    // svelte-ignore state_referenced_locally
    let editValue = $state(String(value ?? ""));
    let isSaving = $state(false);
    let inputRef = $state<HTMLInputElement | null>(null);

    $effect(() => {
        if (!isEditing) {
            editValue = String(value ?? "");
        }
    });

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
        let newValue: string | number | null;
        if (type === "number") {
            newValue = editValue === "" ? null : parseFloat(editValue);
        } else if (type === "integer") {
            newValue =
                editValue === "" ? null : Math.max(0, parseInt(editValue, 10));
        } else if (type === "date") {
            newValue = editValue.trim() === "" ? null : editValue.trim();
        } else {
            newValue = editValue.trim() === "" ? null : editValue.trim();
        }

        const oldValue = value;

        if (newValue === oldValue || (newValue === null && oldValue === null)) {
            isEditing = false;
            return;
        }

        isSaving = true;

        try {
            await onUpdate(newValue);
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

    // Format display value
    function getDisplayValue(): string {
        if (value === null || value === undefined || value === "") {
            return "-";
        }
        if (type === "date" && typeof value === "string") {
            return new Date(value).toLocaleDateString();
        }
        if (type === "number" && typeof value === "number") {
            return value.toFixed(2);
        }
        if (type === "integer" && typeof value === "number") {
            return String(Math.floor(value));
        }
        return String(value);
    }
</script>

{#if isEditing}
    <Input
        bind:ref={inputRef}
        type={type === "date" ? "date" : type === "integer" ? "number" : type}
        step={type === "number" ? "0.01" : type === "integer" ? "1" : undefined}
        min={type === "integer" ? "0" : undefined}
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
        title={String(value ?? "") || "Double-click to edit"}
    >
        {getDisplayValue()}
    </span>
{/if}
