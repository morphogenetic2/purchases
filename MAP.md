# Technical Map of the Application

This document serves as a technical reference for the LabFlow KISS Purchase Manager (Svelte 5 Edition).

## 📂 Project Structure

```plaintext
src/
├── lib/
│   ├── components/       # UI Components (Atomic & Complex)
│   ├── services/         # Business Logic & API calls
│   ├── state/            # State Management (Svelte 5 Runes)
│   ├── excel/            # Excel Parsing & Validation Logic
│   ├── constants/        # App-wide Constants
│   ├── utils/            # Helper functions
│   ├── types.ts          # TypeScript Definitions
│   └── supabaseClient.ts # Supabase Configuration
├── routes/               # SvelteKit Pages
├── app.css               # Global Styles (Tailwind)
└── app.html              # HTML Shell
```

## 🏗 Key Components (`src/lib/components`)

Core UI components that drive the application:

- **`OrderTable.svelte`**: The main view. Handles searching, filtering, sorting, grouping, and renders the list of orders.
- **`OrderRow.svelte`**: Represents a single order row. Handles inline editing, status updates, and selection.
- **`OrderDialog.svelte`**: A modal for creating and editing orders.
- **`ReceiveDialog.svelte`**: Dedicated modal for receiving orders (supports partial reception).
- **`ExcelIngestor.svelte`**: **Two-step modal flow for Excel imports**:
  - **Step 1**: File selection modal (`isFileSelectOpen`) with drag-and-drop zone and "Click to Browse" button
  - **Step 2**: Column mapping modal (`isMappingOpen`) for mapping Excel columns to database fields
  - Uses hidden `<input type="file">` triggered by both modals
  - State: `isDragging` for visual feedback, `parseResult` for Excel data, `mapping` for column relationships
- **`FloatingActionBar.svelte`**: Appears when rows are selected, offering bulk actions (receive, delete, export).
- **`PaginationControls.svelte`**: Reusable pagination component.
- **`ColumnSelector.svelte`** & **`ColumnFilter.svelte`**: Tools for customizing the table view.
- **`OrderToolbar.svelte`**: Contains main action buttons (Export, New Order, Wipe DB) and the ExcelIngestor component.

## 🧠 State Management (`src/lib/state`)

The application uses **Svelte 5 Runes** for reactive state management.

- **`orderState.svelte.ts`**:
  - Manages the global list of orders (`rawOrders`).
  - Handles **Derived State** for filtering, sorting, and grouping (`filteredOrders`, `groupedOrders`).
  - Manages UI state: `searchTerm`, `activeFilters`, `visibleColumns`, `pagination`.
  - **Key Class**: `OrderState` class encapsulates all this logic.

## 🔌 Services (`src/lib/services`)

Business logic is isolated from UI components.

- **`orderService.ts`**:
  - Wraps Supabase calls.
  - Methods: `fetchOrders`, `upsertOrder`, `deleteOrder`, `bulkDelete`, `bulkReceive`.
  - Handles error mapping and database interactions.

## 📊 Excel Ingestion (`src/lib/excel`)

A specialized module for robust Excel importing:

- **`parser.ts`**: raw Excel parsing using `xlsx` library.
- **`transformer.ts`**: Maps Excel columns to application fields (e.g., "Cost" -> `unit_price`). Handles column mapping logic.
- **`validator.ts`**: Validates data integrity (required fields, data types).
- **`fieldDefinitions.ts`**: Defines expected fields, alternatives/aliases, and validation rules.

## 🗃 Key Types (`src/lib/types.ts`)

- **`Order`**: The core data entity.
  - `id`, `description`, `sku`, `quantity`, `unit_price`, `status`, etc.
- **`OrderStatus`**: Union type (`'requested' | 'ordered' | 'received' | ...`).

## 🎨 Styling

- **Tailwind CSS**: Utility-first styling.
- **`src/lib/components/ui/`**: Shadcn-svelte compatible primitive components (Buttons, Inputs, Dialogs).
- **Design System**: Dark mode heavy (Zinc palette), with Emerald for actions/success states.

## 🛠 Important Workflows

### 1. Excel Import Flow (Two-Step Modal Process)

**User Journey:**

1. User clicks "Import / Append Orders" button in `OrderToolbar`
2. `ExcelIngestor` opens **File Selection Modal** (`isFileSelectOpen = true`)
3. User either:
   - Drags Excel file onto drop zone → `handleDrop()` → `processFile()`
   - Clicks "Click to Browse" button → Opens file picker → `handleFile()` → `processFile()`
4. `processFile()` executes:
   - Reads file as binary string (`readFileAsBinaryString()`)
   - Parses Excel data (`parseExcelBuffer()`)
   - Generates auto-mapping suggestions based on column headers
   - Closes file selection modal (`isFileSelectOpen = false`)
   - Opens **Column Mapping Modal** (`isMappingOpen = true`)
5. User maps Excel columns to DB fields (or uses auto-mapping)
6. User sets defaults for unmapped required fields (`defaultOrderedBy`, `defaultOrderDate`)
7. User checks/unchecks "New Order" checkbox (`forceNew`)
8. User clicks "Import Orders" → `handleUpload()`:
   - Transforms data (`transformExcelToOrders()`)
   - Validates data (`validateOrders()`)
   - Inserts into Supabase (`orderService.insertOrders()`)
   - Shows success message
   - Triggers `invalidateAll()` to refresh data
   - Closes mapping modal (`isMappingOpen = false`)

**Key Functions:**

- `processFile(file)`: Core file processing logic (parsing + modal transition)
- `handleFile(e)`: File input change handler
- `handleDrop(e)`: Drag-and-drop event handler
- `handleDragOver/Leave(e)`: Visual feedback for drag state
- `handleUpload()`: Final import execution

**State Variables:**

- `isFileSelectOpen`: Controls file selection modal visibility
- `isMappingOpen`: Controls column mapping modal visibility
- `isDragging`: Visual feedback during drag operations
- `parseResult`: Parsed Excel data (headers, rows, auto-mapping)
- `mapping`: User's column mapping choices
- `forceNew`: Whether to force "new order" status

### 2. Order Loading & Realtime Updates

1. **Initial Load**: `+page.svelte` loads data via `data.orders` from server-side loader
2. `OrderState` is initialized with this data
3. **Realtime Subscription**: Supabase channel listens for database changes
4. On INSERT/UPDATE/DELETE events → `orderState.handleRealtimeEvent()` updates `rawOrders`
5. Derived state (`filteredOrders`, `groupedOrders`) automatically recomputes

### 3. Inline Editing Flow

1. User edits field in `OrderRow`
2. `onUpdate` callback triggered
3. Calls `orderService.updateOrder(id, changes)`
4. Supabase updates database
5. Realtime event propagates change to all connected clients
6. `OrderState` updates automatically

### 4. Filtering & Search

1. User types in search box or selects filters in `OrderTable`
2. Updates `state.searchTerm` or `state.activeFilters`
3. `filteredOrders` (derived state) recomputes automatically
4. Pagination resets to page 1 (via `$effect`)
5. No database refetch—purely client-side filtering

### 5. Bulk Actions

1. User selects multiple rows (checkboxes in `OrderRow`)
2. `FloatingActionBar` appears with bulk action buttons
3. User clicks action (e.g., "Receive All")
4. `OrderTable` calls `handleBulkReceiveRequest(ids)`
5. Opens `ReceiveDialog` with selected orders
6. User confirms → `orderService.bulkReceive()`
7. Database updated → Realtime propagates changes

## 🔄 Component Interaction Patterns

- **Parent → Child Props**: `+page.svelte` passes `orderState` and callbacks to `OrderTable`
- **Child → Parent Events**: `OrderTable` emits `onEdit`, `onReceive` to `+page.svelte`
- **Service Layer**: Components never call Supabase directly—always use `orderService`
- **State Reactivity**: Svelte 5 runes (`$state`, `$derived`, `$effect`) handle all reactivity

## 🎨 UI/UX Patterns

- **Dark Theme**: Zinc-900/950 backgrounds, Zinc-100/200 text
- **Accent Color**: Emerald-600/700 for primary actions
- **Hover States**: Subtle border/background color shifts
- **Animations**: 300ms transitions for smooth interactions
- **Drag-and-Drop**: Scale transform (1.02), color shift (emerald), bounce animation on icon
- **Modals**: Shadcn-inspired Dialog components with backdrop blur
