import { writable } from "svelte/store";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

const TOAST_DURATION_MS = 3500;

let nextToastId = 1;

export const toasts = writable<ToastMessage[]>([]);

export function addToast(
    message: string,
    type: ToastType = "info",
    durationMs: number = TOAST_DURATION_MS,
) {
    const id = nextToastId++;
    toasts.update((items) => [...items, { id, message, type }]);

    setTimeout(() => {
        removeToast(id);
    }, durationMs);

    return id;
}

export function removeToast(id: number) {
    toasts.update((items) => items.filter((item) => item.id !== id));
}
