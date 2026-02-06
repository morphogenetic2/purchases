# Architecture Overview: LabFlow KISS Purchase Manager

Welcome! This document explains how the application is built, starting with a simple analogy and moving into the technical details for a developer.

---

## 1. The Big Picture (The Lego Analogy)

Imagine this app is like a physical **Office Filing System**:

1.  **The Desk (The Interface)**: Where you see the orders, filter them, and click buttons. This is **Svelte**.
2.  **The Office Manager (The State)**: A person who keeps track of what’s currently on the desk. If you search for "Gloves", the Manager hides everything else. This is the **OrderState**.
3.  **The Messenger (The API)**: When you want to save a new order, you don't walk into the basement yourself. You hand a paper to the Messenger, who takes it downstairs. This is the **OrderService**.
4.  **The Basement Vault (The Database)**: Where all orders are locked away safely forever. This is **Supabase**.
5.  **The Translator (Excel Ingestor)**: Someone who takes a messy handwritten list (Excel) and neatly fills out the office forms so the Messenger can understand them.

---

## 2. The Tech Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | [Svelte 5](https://svelte.dev) | Building the UI with "Runes" for state management. |
| **Backend** | [SvelteKit](https://kit.svelte.dev) | Hosting the app and providing the API (The Messenger). |
| **Database** | [Supabase](https://supabase.com) | Storing data and notifying us of changes in real-time. |
| **Styles** | Vanilla CSS + [bits-ui](https://bits-ui.com) | Making things look premium and dark-themed. |
| **Excel** | [XLSX (SheetJS)](https://sheetjs.com) | Reading and writing spreadsheet files. |

---

## 3. Core Components

### A. The "Brain" (`src/lib/state/orderState.svelte.ts`)
This file is the single source of truth for the local UI:
- It holds the list of orders.
- It calculates filtered and grouped views (e.g., "Group by Date").
- It handles "Real-time" events—if Amy in the other room adds an order, Supabase tells this file, and the table updates instantly without a refresh.

### B. The "Messengers" (`src/lib/services/orderService.ts` & `src/routes/api/`)
We separated the **Web Page** from the **Database** for security.
- The `orderService` starts a request (a "fetch").
- The API route in `src/routes/api/orders/+server.ts` receives it, validates it, and talks to the **Vault** (Supabase).

### C. The "Translator" (`src/lib/excel/`)
Excel files are messy. This module:
- `parser.ts`: Reads the file into raw data.
- `transformer.ts`: Maps "PROVEEDOR" to "provider" so the database understands it.
- `validator.ts`: Checks if you forgot required fields (like "Ordered By").

---

## 4. Key Data Flows

### Adding an Order
1. User clicks "New Order" in `OrderToolbar.svelte`.
2. `OrderDialog.svelte` collects the data.
3. It calls `orderService.upsertOrder()`.
4. The Messenger (API) sends it to Supabase.
5. Supabase sends a "Ping" back to all open browsers.
6. The "Brain" (`OrderState`) receives the ping and adds the new order to the table automatically.

---

## 5. Summary for Developers

- **State**: Use the `OrderState` class. It uses Svelte 5 runes (`$state`, `$derived`).
- **Styles**: We use a custom zinc/dark theme. Buttons and UI elements are in `src/lib/components/ui/`.
- **Database**: All table definitions are in `schema.sql`.
- **Environment**: Secrets (like API keys) are kept in `.env`.

> [!TIP]
> If you want to change how orders are grouped, look at the `groupedOrders` function in `orderState.svelte.ts`. If you want to change the database, check `src/routes/api/`.
