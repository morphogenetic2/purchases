import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Consistent date formatter using Intl.DateTimeFormat
 * Uses en-GB locale for DD/MM/YYYY format
 */
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric'
});

/**
 * Format a date string or Date object to a consistent display format (DD/MM/YYYY)
 * @param date - Date string, Date object, or null/undefined
 * @returns Formatted date string or '-' if invalid
 */
export function formatDate(date: string | Date | null | undefined): string {
	if (!date) return '-';

	const parsed = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(parsed.getTime())) return '-';

	return dateFormatter.format(parsed);
}

/**
 * Format a date for filter comparison (consistent key format)
 * @param date - Date string or Date object
 * @returns Formatted date string for use as filter key
 */
export function formatDateForFilter(date: string | Date): string {
	const parsed = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(parsed.getTime())) return '';

	return dateFormatter.format(parsed);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

