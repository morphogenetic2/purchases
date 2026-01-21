/**
 * Order-related constants and type definitions.
 * Centralizes magic strings to prevent typos and enable easy refactoring.
 */

// Order Status
export const ORDER_STATUS = {
    REQUESTED: 'requested',
    ORDERED: 'ordered',
    RECEIVED: 'received',
    PARTIALLY_RECEIVED: 'partially_received',
    CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];


// Group By Options
export const GROUP_BY_OPTIONS = {
    NONE: 'none',
    DATE: 'date',
    PROVIDER: 'provider',
    REQUESTER: 'requester',
    STATUS: 'status',
} as const;

export type GroupByOption = typeof GROUP_BY_OPTIONS[keyof typeof GROUP_BY_OPTIONS];

// Group By Labels (for UI display)
export const GROUP_BY_LABELS: Record<GroupByOption, string> = {
    [GROUP_BY_OPTIONS.NONE]: 'No Grouping',
    [GROUP_BY_OPTIONS.DATE]: 'Group by Date',
    [GROUP_BY_OPTIONS.PROVIDER]: 'Group by Provider',
    [GROUP_BY_OPTIONS.REQUESTER]: 'Group by Requester',
    [GROUP_BY_OPTIONS.STATUS]: 'Group by Status',
};

// Default pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 50,
    PAGE_SIZE_OPTIONS: [25, 50, 100, 250, 500, 1000, 10000] as const,
} as const;

// Predefined ordered by options (for Excel import defaults)
export const PREDEFINED_ORDERED_BY = ['ARN', 'MA', 'FM', 'DA'] as const;

// Status color classes for badges
export const STATUS_COLORS: Record<OrderStatus | string, string> = {
    [ORDER_STATUS.RECEIVED]: 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/20',
    [ORDER_STATUS.PARTIALLY_RECEIVED]: 'bg-sky-500/15 text-sky-500 hover:bg-sky-500/25 border-sky-500/20',
    [ORDER_STATUS.CANCELLED]: 'bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20',
    [ORDER_STATUS.ORDERED]: 'bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 border-blue-500/20',
    [ORDER_STATUS.REQUESTED]: 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/20',
};

// Default status color (fallback)
export const DEFAULT_STATUS_COLOR = STATUS_COLORS[ORDER_STATUS.REQUESTED];
