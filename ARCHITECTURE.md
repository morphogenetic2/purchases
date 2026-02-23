# Architecture Overview: LabFlow KISS Purchase Manager

Welcome! This document explains how the application is built, starting with a simple analogy and moving into the technical details for a developer.

---

## 1. The Big Picture (The Lego Analogy)

Imagine this app is like a physical **Office Filing System**:

1.  **The Desk (The Interface)**: Where you see the orders, filter them, and click buttons. This is **Svelte**.
2.  **The Office Manager (The State)**: A person who keeps track of what's currently on the desk. If you search for "Gloves", the Manager hides everything else. This is the **OrderState**.
3.  **The Messenger (The API)**: When you want to save a new order, you don't walk into the basement yourself. You hand a paper to the Messenger, who takes it downstairs. This is the **OrderService**.
4.  **The Basement Vault (The Database)**: Where all orders are locked away safely forever. This is **Supabase**.
5.  **The Translator (Excel Ingestor)**: Someone who takes a messy handwritten list (Excel) and neatly fills out the office forms so the Messenger can understand them.

---

## 2. The Tech Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend Framework** | [Svelte 5](https://svelte.dev) | Building the UI with "Runes" for state management. |
| **Full-stack Framework** | [SvelteKit](https://kit.svelte.dev) | Hosting the app, SSR, and providing the API (The Messenger). |
| **Database** | [Supabase](https://supabase.com) | PostgreSQL database with Row Level Security (RLS) and real-time subscriptions. |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) + [bits-ui](https://bits-ui.com) | Utility-first CSS with accessible component primitives. |
| **Excel Processing** | [XLSX (SheetJS)](https://sheetjs.com) | Reading and writing spreadsheet files in the browser. |
| **Icons** | [Lucide Svelte](https://lucide.dev/icons) | Consistent iconography. |
| **Testing** | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) | Unit and component testing. |

---

## 3. Project Structure

```
purchases/
├── src/
│   ├── lib/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/               # bits-ui based primitives (Button, Input, Dialog, etc.)
│   │   │   ├── OrderTable.svelte
│   │   │   ├── OrderRow.svelte
│   │   │   ├── OrderToolbar.svelte
│   │   │   ├── OrderDialog.svelte
│   │   │   ├── ReceiveDialog.svelte
│   │   │   ├── ExcelIngestor.svelte
│   │   │   ├── ExportDialog.svelte
│   │   │   ├── ColumnFilter.svelte
│   │   │   ├── ColumnSelector.svelte
│   │   │   ├── PaginationControls.svelte
│   │   │   ├── FloatingActionBar.svelte
│   │   │   ├── ConfirmDialog.svelte
│   │   │   ├── EditableCell.svelte
│   │   │   └── ToastViewport.svelte
│   │   │
│   │   ├── state/                # Client-side state management
│   │   │   ├── orderState.svelte.ts   # Main order state with Svelte 5 runes
│   │   │   └── toastState.ts          # Toast notifications
│   │   │
│   │   ├── services/             # API client services
│   │   │   └── orderService.ts        # HTTP client for order CRUD operations
│   │   │
│   │   ├── excel/                # Excel import processing
│   │   │   ├── parser.ts             # Parses Excel files into JSON
│   │   │   ├── transformer.ts        # Transforms Excel rows to Order objects
│   │   │   ├── validator.ts         # Validates orders before import
│   │   │   ├── fieldDefinitions.ts   # Field mapping definitions
│   │   │   └── index.ts             # Public API
│   │   │
│   │   ├── utils/                # Utility functions
│   │   │   ├── export.ts            # Excel export functionality
│   │   │   ├── utils.ts             # General utilities (cn, getStatusColor)
│   │   │   └── actions/
│   │   │       └── resizable.ts     # Svelte action for column resizing
│   │   │
│   │   ├── constants/            # Application constants
│   │   │   └── order.ts              # Order statuses, group options, pagination
│   │   │
│   │   ├── types.ts             # TypeScript interfaces (Order, Column, etc.)
│   │   │
│   │   ├── supabaseClient.ts    # Public Supabase client (anon key)
│   │   │
│   │   └── server/
│   │       └── supabaseAdmin.ts     # Admin Supabase client (service role)
│   │
│   ├── routes/
│   │   ├── +layout.svelte       # Root layout with Toast viewport
│   │   ├── +page.svelte        # Main orders page
│   │   ├── +page.server.ts      # Server-side data loading
│   │   ├── login/
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.ts
│   │   └── api/
│   │       └── orders/
│   │           ├── +server.ts       # Main CRUD API (GET, POST, PATCH, DELETE)
│   │           └── receive/
│   │               └── +server.ts    # Bulk receive API
│   │
│   ├── hooks.server.ts          # Server hooks for auth
│   ├── app.css                  # Global styles and theme
│   ├── app.html                 # HTML template
│   └── app.d.ts                 # Type declarations
│
├── schema.sql                   # Database schema and RLS policies
├── package.json
├── svelte.config.js
├── vite.config.ts
└── vitest.config.ts
```

---

## 4. Core Components

### A. The "Brain" (`src/lib/state/orderState.svelte.ts`)

This file is the **single source of truth** for the local UI state. It uses Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactivity:

- **State Properties:**
  - `rawOrders`: Array of all orders loaded from database
  - `searchTerm`: Current text search query
  - `activeFilters`: Multi-select filters for requester, status, date, provider
  - `groupBy`: Current grouping mode (none, date, provider, requester, status)
  - `selectedIds`: Set of selected order IDs for bulk actions
  - `currentPage`, `pageSize`: Pagination state
  - `columns`: Column visibility configuration

- **Derived State:**
  - `filteredOrders`: Applies search + filters to raw orders
  - `paginatedOrders`: Applies pagination to filtered orders
  - `groupedOrders`: Groups paginated orders by the selected groupBy option
  - `filterOptions`: Unique values for each filter dropdown (computed from rawOrders)
  - `visibleColumns`: Columns that are currently visible

- **Real-time Updates:**
  - `handleRealtimeEvent(payload)`: Processes INSERT/UPDATE/DELETE events from Supabase
  - When another user modifies an order, the table updates instantly via Supabase Realtime

- **Persistence:**
  - `savePreferences()` / `loadPreferences()`: Persists column visibility, filters, page size, and custom presets to localStorage

### B. The "Messengers" (`src/lib/services/orderService.ts` & `src/routes/api/`)

We separated the **Web Page** from the **Database** for security:

- The `orderService` in the client creates fetch requests
- The API routes in `src/routes/api/` receive requests, validate input, and talk to Supabase using the **admin client** (service role key)

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | Fetch all orders |
| POST | `/api/orders` | Create single or bulk orders (upsert) |
| PATCH | `/api/orders` | Update single or bulk orders |
| DELETE | `/api/orders` | Delete single or bulk orders |
| POST | `/api/orders/receive` | Bulk mark orders as received |

### C. The "Translator" (`src/lib/excel/`)

Excel files are messy. This module provides a complete pipeline:

1.  **parser.ts**: Reads an Excel file and extracts:
    - Headers (first row)
    - Preview data (first 5 rows)
    - All data as JSON
    - Auto-mapping based on header names

2.  **transformer.ts**: Transforms raw Excel rows to Order objects:
    - Applies column mapping (user can map "PROVEEDOR" to "provider")
    - Handles data type conversions (Excel dates → ISO strings, numbers, etc.)
    - Applies defaults for unmapped required fields
    - Filters out empty/invalid rows

3.  **validator.ts**: Validates transformed orders:
    - Checks required fields (ordered_by, provider, description)
    - Returns detailed error messages for failed validations

4.  **fieldDefinitions.ts**: Central schema defining:
    - All database fields with labels
    - Required fields
    - Aliases for Spanish column names (PROVEEDOR, DESCRIPCION, etc.)

### D. State Management (Toast Notifications)

`src/lib/state/toastState.ts` provides a simple toast notification system:

- `addToast(message, type, duration)`: Shows a notification (success/error/info)
- `toasts`: Svelte store of active toasts
- `ToastViewport.svelte`: Renders toasts in the UI

---

## 5. Data Models

### Order (Database)

```typescript
interface Order {
    id: string;                    // UUID (primary key)
    created_at: string;            // Timestamp with timezone
    order_date?: string;           // Date (optional, from Excel)
    description: string;            // Required
    sku?: string;                  // Product reference
    provider: string;              // Required
    ordered_by: string;            // Required (requester)
    project_code?: string;         // Project identifier
    po_number?: string;            // Purchase order number
    quantity: number;              // Required, default 1
    unit_price?: number;           // Price per unit
    status: string;                // requested, ordered, received, partially_received, cancelled
    received_date?: string;        // Date when order was received
    quantity_received?: number;   // How many units received
    storage_location?: string;     // Where it's stored
    is_received?: boolean;         // Flag if fully received
}
```

### Column Configuration

```typescript
interface Column {
    id: keyof Order | "actions" | "price_formatted" | "date_formatted";
    label: string;
    visible: boolean;
}
```

### Filter State

```typescript
interface ActiveFilters {
    requester: string[];
    status: string[];
    date: string[];
    provider: string[];
}
```

---

## 6. Key Data Flows

### Adding an Order (Manual)

1.  User clicks "New Order" in `OrderToolbar.svelte`
2.  `OrderDialog.svelte` opens and collects form data
3.  Calls `orderService.upsertOrder(order)`
4.  POST request to `/api/orders`
5.  API uses `supabaseAdmin` to upsert into database
6.  Supabase sends a "Realtime" broadcast
7.  All connected clients receive the INSERT event
8.  `OrderState.handleRealtimeEvent()` adds the new order to `rawOrders`
9.  UI updates automatically via Svelte reactivity

### Importing from Excel

1.  User clicks "Import / Append Orders" in toolbar
2.  `ExcelIngestor.svelte` shows drag-and-drop modal
3.  User drops Excel file → `parser.ts` parses it
4.  Auto-mapping guesses column correspondences
5.  User confirms/adjusts mapping and clicks "Import"
6.  `transformer.ts` converts rows to Order objects
7.  `validator.ts` checks required fields
8.  If valid: `orderService.insertOrders(orders)` → POST to API
9.  Database receives batch insert
10. UI refreshes via `invalidateAll()`

### Marking as Received

1.  User clicks "Receive" on an order (or bulk select)
2.  `ReceiveDialog.svelte` opens for date/location input
3.  Calls `orderService.quickReceive(id)` or `bulkReceive(ids)`
4.  POST to `/api/orders/receive`
5.  API updates status to 'received', sets received_date to today (or provided date)
6.  Supabase broadcasts UPDATE event
7.  All clients update automatically

---

## 7. Security Model

### Authentication

- Simple cookie-based authentication via `hooks.server.ts`
- All routes except `/login` require a valid `lab_access_token` cookie
- The token value is checked against `VALID_TOKEN` (hardcoded 'authenticated')

### Database Security (RLS)

The `schema.sql` file defines Row Level Security policies:

- **SELECT**: Allowed for both `anon` and `authenticated` roles (required for realtime subscriptions to work)
- **INSERT/UPDATE/DELETE**: NOT allowed for `anon` role
- All data modifications MUST go through the SvelteKit API routes
- API routes use `supabaseAdmin` (service role key) which bypasses RLS

### Environment Variables

```
PUBLIC_SUPABASE_URL      # Public URL for client Supabase client
PUBLIC_SUPABASE_ANON_KEY # Public anon key for client
SUPABASE_SERVICE_ROLE_KEY # Secret key for server-side admin operations (bypasses RLS)
LAB_PASSWORD             # Password for simple auth
```

---

## 8. Styling and Theming

### CSS Architecture

- **Tailwind CSS 4** with `@theme` directive for design tokens
- **bits-ui** component primitives (Button, Dialog, DropdownMenu, etc.)
- **Custom dark theme**: Zinc-based color palette
- **CSS Variables**: Defined in `app.css` for theming

### Color Scheme (Dark Mode)

| Token | Usage |
|-------|-------|
| `bg-zinc-950` | Main background |
| `bg-zinc-900` | Cards, dialogs |
| `bg-zinc-800` | Hover states, borders |
| `text-zinc-100` | Primary text |
| `text-zinc-400` | Secondary text |
| `border-zinc-700/800` | Borders |
| `emerald-500/600` | Primary actions, success |
| `amber-500` | Requested status |
| `blue-500` | Ordered status |
| `sky-500` | Partially received |
| `red-500` | Cancelled |

---

## 9. Testing

- **Vitest** for unit testing
- **Testing Library** for component testing
- Tests located in `src/tests/`
- Run with `npm test` or `npm run test:coverage`

---

## 10. Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run check        # TypeScript type checking
npm test             # Run tests
npm run test:watch   # Watch mode for tests
npm run test:coverage # Generate coverage report
```

---

## 11. Summary for Developers

### Key Files by Feature

| Feature | Key Files |
|---------|-----------|
| **Order List UI** | `src/routes/+page.svelte`, `OrderTable.svelte`, `OrderRow.svelte` |
| **State Management** | `src/lib/state/orderState.svelte.ts` |
| **Data Fetching** | `src/routes/+page.server.ts`, `src/lib/services/orderService.ts` |
| **Excel Import** | `src/lib/components/ExcelIngestor.svelte`, `src/lib/excel/*` |
| **Excel Export** | `src/lib/utils/export.ts` |
| **Database Schema** | `schema.sql` |
| **Authentication** | `src/hooks.server.ts`, `src/routes/login/*` |
| **API Routes** | `src/routes/api/orders/*` |

### Common Tasks

- **Adding a new field to orders:**
  1. Add to `schema.sql` → Run migration
  2. Add to `src/lib/types.ts` → Order interface
  3. Add to `src/lib/constants/order.ts` → DB_FIELDS if importable
  4. Add column to `orderState.columns`

- **Changing filter logic:** Modify `filteredOrders` getter in `orderState.svelte.ts`

- **Adding a new status:** Add to `ORDER_STATUS` in `constants/order.ts` and add color to `STATUS_COLORS`

> [!TIP>
> If you want to change how orders are grouped, look at the `groupedOrders` function in `orderState.svelte.ts`. If you want to change the database, check `schema.sql` and run migrations in Supabase.
