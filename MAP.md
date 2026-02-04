# Technical Map of the Application

This document serves as a technical reference for the LabFlow KISS Purchase Manager (Svelte 5 Edition).

## 📂 Project Structure

```
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
- **`ExcelIngestor.svelte`**: Handles file drag-and-drop and triggers the Excel parsing pipeline.
- **`FloatingActionBar.svelte`**: Appears when rows are selected, offering bulk actions (receive, delete, export).
- **`PaginationControls.svelte`**: Reusable pagination component.
- **`ColumnSelector.svelte`** & **`ColumnFilter.svelte`**: Tools for customizing the table view.

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

1. **Loading Orders**: `+page.svelte` loads data via `data.orders`. `OrderState` is initialized with this data.
2. **Editing**: Inline editing in `OrderRow` calls `onUpdate` -> `orderService.updateOrder`.
3. **Filtering**: Updates to `state.activeFilters` trigger pure computations in `orderState` (no DB refetching).
4. **Bulk Actions**: `FloatingActionBar` triggers `onBulkReceive` or `handleBulkDelete` in `OrderTable`.
