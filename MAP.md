# MAP.md - Current Architecture (LLM-Oriented)

This file is a navigation map for quickly locating logic in the codebase.

## 1) Fast Entry Points

- App shell and global styles: `src/routes/+layout.svelte`, `src/app.css`
- Main page (orders UI): `src/routes/+page.svelte`
- Main data loader: `src/routes/+page.server.ts`
- Auth gate: `src/hooks.server.ts`
- Login flow: `src/routes/login/+page.svelte`, `src/routes/login/+page.server.ts`
- API endpoints: `src/routes/api/**/+server.ts`
- Client service wrapper for APIs: `src/lib/services/orderService.ts`
- Stateful client model: `src/lib/state/orderState.svelte.ts`
- Excel import pipeline: `src/lib/excel/*`

## 2) Runtime Topology (What talks to what)

```text
Browser UI (Svelte components)
  -> orderService (fetch /api/*)
  -> SvelteKit API routes (server)
  -> supabaseAdmin (service role client)
  -> Supabase Postgres (orders table)

Browser UI also:
  -> supabase anon client
  -> realtime channel "postgres_changes" on orders
  -> orderState.handleRealtimeEvent(...)
```

Important: `src/hooks.server.ts` currently enforces cookie auth on all routes except `/login` (including `/api/*`), even though the comment says API routes should bypass auth.

## 3) Directory Ownership Map

```text
src/
  routes/
    +layout.svelte                 # imports global CSS + favicon
    +page.server.ts                # initial orders fetch from Supabase (server-side)
    +page.svelte                   # orchestration page (toolbar/table/dialogs/realtime)
    login/
      +page.svelte                 # password form UI
      +page.server.ts              # validates LAB_PASSWORD, sets auth cookie
    api/
      orders/+server.ts            # GET/POST/PATCH/DELETE orders
      orders/receive/+server.ts    # bulk mark received

  lib/
    server/supabaseAdmin.ts        # service-role Supabase client (server only)
    supabaseClient.ts              # anon Supabase client (browser/realtime)
    services/orderService.ts       # all client->API calls + response normalization
    state/orderState.svelte.ts     # client-side state model + derived filtering/grouping/paging
    excel/
      fieldDefinitions.ts          # importable field schema + aliases + required flags
      parser.ts                    # xlsx read + header extraction + auto-map
      transformer.ts               # raw row -> Order-like object transform
      validator.ts                 # required-field validation + message formatter
      index.ts                     # barrel exports
    components/
      OrderToolbar.svelte          # top actions (export/import/new)
      OrderTable.svelte            # search/filter/group/table + bulk actions
      OrderRow.svelte              # row rendering + inline edit surfaces
      EditableCell.svelte          # dbl-click inline editor primitive
      OrderDialog.svelte           # create/edit/delete modal
      ReceiveDialog.svelte         # partial/single and bulk receive modal
      ExcelIngestor.svelte         # 2-step import modal flow
      ExportDialog.svelte          # export options modal
      FloatingActionBar.svelte     # bulk actions when rows selected
      ColumnFilter.svelte          # per-column multi-select filters
      ColumnSelector.svelte        # show/hide table columns
      PaginationControls.svelte    # page + size controls
      ui/**                        # reusable primitives (button/dialog/table/etc.)
    constants/order.ts             # statuses/group-by/pagination/colors/defaults
    utils.ts                       # cn() + status color helper
    utils/export.ts                # xlsx export writer
    types.ts                       # Order/Column/realtime payload interfaces
    actions/resizable.ts           # column-resize action

  tests/
    api/*                          # endpoint behavior tests
    excel/*                        # parser/transformer/validator tests
    components/*                   # ExcelIngestor + ReceiveDialog tests
    constants.test.ts              # constants integrity tests
    utils.test.ts                  # helper behavior tests
```

## 4) Main Flows (Exact File Chains)

### A) Initial page load

1. `src/routes/+page.server.ts` loads `orders` from Supabase.
2. `src/routes/+page.svelte` constructs `new OrderState(data.orders)`.
3. Page renders `OrderToolbar`, `OrderTable`, and dialogs.

### B) Realtime updates

1. `src/routes/+page.svelte` subscribes to `supabase.channel("table-db-changes")`.
2. Postgres events call `orderState.handleRealtimeEvent(...)`.
3. `src/lib/state/orderState.svelte.ts` mutates `rawOrders` for INSERT/UPDATE/DELETE.

### C) Inline edit save

1. User edits in `src/lib/components/EditableCell.svelte`.
2. `src/lib/components/OrderRow.svelte` bubbles `onUpdate(id, field, value)`.
3. `src/lib/components/OrderTable.svelte` -> `orderService.updateOrder(...)`.
4. `src/lib/services/orderService.ts` sends `PATCH /api/orders`.
5. `src/routes/api/orders/+server.ts` loops updates by `id`.

### D) Excel import

1. `src/lib/components/ExcelIngestor.svelte` reads file (`readFileAsBinaryString`).
2. Parses workbook (`parseExcelBuffer`), builds/edits mapping.
3. Transforms rows (`transformExcelToOrders`) + validates (`validateOrders`).
4. Uploads through `orderService.insertOrders(...)` -> `POST /api/orders`.
5. Calls `invalidateAll()` to refresh server data.

### E) Receive orders

- Single order: `ReceiveDialog` uses `orderService.updateOrder(...)` for partial/full receive.
- Bulk orders: `ReceiveDialog` uses `orderService.bulkReceive(ids, options)` -> `POST /api/orders/receive`.
- Server route applies `status=received`, `quantity_received=quantity`, `is_received=true`.

## 5) API Contract Quick Reference

### `GET /api/orders`
- File: `src/routes/api/orders/+server.ts`
- Response: `{ orders: Order[] }`

### `POST /api/orders`
- File: `src/routes/api/orders/+server.ts`
- Body: order object or array of order objects
- Behavior:
  - Auto-adds `id` if missing via `crypto.randomUUID()`
  - Uses Supabase `upsert(...)`
- Response: `{ data: ... }`

### `PATCH /api/orders`
- File: `src/routes/api/orders/+server.ts`
- Body: `{ id, ...fields }` or array of those
- Behavior: loops and updates each row by `id`
- Response: `{ data: updatedRow | updatedRows[] }`

### `DELETE /api/orders`
- File: `src/routes/api/orders/+server.ts`
- Body: `{ id }` or `{ ids: string[] }`
- Response: `{ success: true }`

### `POST /api/orders/receive`
- File: `src/routes/api/orders/receive/+server.ts`
- Body: `{ ids: string[], receivedDate?: string, storageLocation?: string }`
- Response: `{ success: true, updated: number }`

## 6) State Model (`OrderState`)

File: `src/lib/state/orderState.svelte.ts`

Core mutable state:
- `rawOrders`, `searchTerm`, `sortDirection`, `groupBy`
- `selectedIds` (`SvelteSet`)
- `currentPage`, `pageSize`
- `columns`, `activeFilters`

Derived state:
- `visibleColumns`
- `filterOptions` (requester/status/provider/date lists)
- `filteredOrders` (search + filters + date sort)
- `totalPages`, `paginatedOrders`, `pageInfo`
- `groupedOrders` (groups paginated orders by selected dimension)

Key mutators:
- `setOrders`, `handleRealtimeEvent`, `toggleSelection`, `toggleAll`, `clearSelection`
- `setGroupBy`, `toggleSort`, `setPage`, `setPageSize`

## 7) Data Model and DB Schema

- Type interface: `src/lib/types.ts` (`Order`)
- SQL schema: `schema.sql` (`public.orders`)
- Status constants: `src/lib/constants/order.ts` (`ORDER_STATUS`)

Supabase clients:
- Browser (anon): `src/lib/supabaseClient.ts`
- Server/admin (service role): `src/lib/server/supabaseAdmin.ts`

## 8) Auth Model

- Password source: `LAB_PASSWORD` env var.
- Login sets cookie `lab_access_token=authenticated` for 1 week.
- Guard in `src/hooks.server.ts` redirects unauthenticated requests to `/login`.

Files:
- `src/routes/login/+page.server.ts`
- `src/routes/login/+page.svelte`
- `src/hooks.server.ts`

## 9) Test Coverage Map

- API behavior:
  - `src/tests/api/orders-route.test.ts`
  - `src/tests/api/orders-receive-route.test.ts`
- Excel pipeline:
  - `src/tests/excel/parser.test.ts`
  - `src/tests/excel/transformer.test.ts`
  - `src/tests/excel/validator.test.ts`
- Component flows:
  - `src/tests/components/ExcelIngestor.test.ts`
  - `src/tests/components/ReceiveDialog.test.ts`
- Constants/utils:
  - `src/tests/constants.test.ts`
  - `src/tests/utils.test.ts`

## 10) Task-to-File Lookup (for LLMs)

- "Add new order field end-to-end":
  - `schema.sql`
  - `src/lib/types.ts`
  - `src/lib/components/OrderDialog.svelte`
  - `src/lib/components/OrderRow.svelte`
  - `src/lib/state/orderState.svelte.ts` (filters/columns/grouping if needed)
  - `src/lib/excel/fieldDefinitions.ts` + `transformer.ts` + `validator.ts` (if import/export affected)

- "Change receive behavior":
  - `src/lib/components/ReceiveDialog.svelte`
  - `src/lib/services/orderService.ts`
  - `src/routes/api/orders/receive/+server.ts`
  - `src/lib/constants/order.ts`

- "Change auth/login":
  - `src/hooks.server.ts`
  - `src/routes/login/+page.server.ts`
  - `src/routes/login/+page.svelte`
  - `.env` / `.env.example`

- "Change export format":
  - `src/lib/utils/export.ts`
  - `src/lib/components/ExportDialog.svelte`

- "Change table filtering/grouping/pagination":
  - `src/lib/state/orderState.svelte.ts`
  - `src/lib/components/OrderTable.svelte`
  - `src/lib/components/PaginationControls.svelte`
