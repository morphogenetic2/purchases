Technical Design Document v2: LabFlow KISS Purchase Manager (Svelte Edition)
Target: High-Reasoning AI Implementation Partner (Gemini 3 Pro) Concept: "The Lab-Bench Dashboard" — High-contrast dark mode, zero-latency, functional utility. Stack: SvelteKit + Tailwind + Shadcn-Svelte + Supabase.

1. System Architecture
Framework: SvelteKit (App-level routing, Server-Side Rendering for fast initial loads).

Styling: Tailwind CSS (Theme: "Zinc" Dark Mode).

Components: shadcn-svelte (Radix-based, accessible, clean).

State Management: Svelte Writable Stores (Minimalist, global state).

Database/Auth: Supabase (Postgres + Simple Session Auth).

Parsing: xlsx library for browser-side Excel processing.

2. Updated Database Schema (PostgreSQL)
Same robust foundation, designed for easy filtering and reporting.

SQL

-- Core Table for Purchases
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Status Tracking
  status TEXT DEFAULT 'requested', -- requested, ordered, received, cancelled
  
  -- Item Details
  order_date DATE DEFAULT CURRENT_DATE,
  ordered_by TEXT NOT NULL,       -- Student/PI Name
  provider TEXT NOT NULL,         -- e.g., Sigma, Fisher
  sku TEXT,                       -- Catalog reference
  description TEXT NOT NULL,      -- Product description
  
  -- Financials
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12, 2) DEFAULT 0.00,
  project_code TEXT,              -- Grant/Lab Project ID
  po_number TEXT,                 -- Internal Purchase Order
  
  -- Logistics
  is_received BOOLEAN DEFAULT FALSE,
  received_date DATE,
  received_by TEXT,
  storage_location TEXT           -- e.g., "Fridge B", "Cabinet 4"
);

-- Index for fast searching
CREATE INDEX idx_orders_sku ON orders(sku);
CREATE INDEX idx_orders_status ON orders(status);
3. Modular Implementation Strategy (Svelte Patterns)
A. The "Vibe-Auth" Guard
Strategy: SvelteKit hooks.server.js.

Logic: Intercept requests. If no lab_access_token cookie exists, redirect to /login.

KISS: Compare user input against a single LAB_PASSWORD environment variable.

B. The Smart Excel Ingestor (lib/excel.ts)
Mapping Engine: A Svelte component that takes an uploaded file, extracts headers, and uses a reactive object to let users "drag-and-drop" map their Excel headers to the DB schema.

Data Cleaning: Trim whitespace, force SKU to uppercase, and default unit_price to 0 if malformed.

C. The Functional UI (Dark Mode)
Main View: A shadcn Data Table with sticky headers.

Color Palette: * Background: Zinc-950 (#09090b)

Cards: Zinc-900

Text: Zinc-100

Accents: Emerald (Received), Amber (Requested), Blue (Ordered).

4. Specific Prompts for Gemini 3 Pro
Task 1: The Foundation
"Initialize a SvelteKit project using Tailwind and Shadcn-Svelte. Set up the Supabase client and the SQL schema provided. Create the server-side hook for a simple shared-password authentication system."

Task 2: The Ingestor logic
"Write a Svelte component that uses the xlsx library. It should allow a user to upload an Excel file, display the first 5 rows in a preview, and provide a dropdown to map the Excel columns to the orders table schema before performing a bulk upsert to Supabase."

Task 3: The Dashboard
"Create a responsive data table in Svelte that fetches the orders table. Implement a 'Quick Receive' button on each row that updates the status to 'received' and sets the received_date to today's date in a single click."

5. Maintenance & Extensibility
Modular: All Supabase calls should live in $lib/supabaseClient.ts.

Updatable: Adding a new column (like "Expiration Date") only requires a SQL ALTER TABLE and one extra <Input /> in the Svelte form.