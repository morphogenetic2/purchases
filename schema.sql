-- Create the orders table
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  order_date date,
  description text not null,
  sku text,
  provider text,
  ordered_by text,
  project_code text,
  po_number text,
  quantity integer not null default 1,
  unit_price numeric,
  status text not null default 'requested',
  received_date date,
  quantity_received integer default 0,
  storage_location text,
  is_received boolean default false
);

-- Enable Row Level Security
alter table public.orders enable row level security;

-- No client-facing policies are created. The SvelteKit server uses the
-- service-role client after checking the lab access cookie; browser clients
-- must not be able to read the purchase data directly.

create table public.requesters (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  initials text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.requesters enable row level security;

-- As with orders, requester management goes through authenticated server APIs.
