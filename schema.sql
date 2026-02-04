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

-- Create policy to allow ANYONE to READ (Select)
-- This is required for Realtime subscriptions to work on the client side
create policy "Allow Anon Select"
on public.orders
for select
to anon, authenticated
using (true);

-- Note: No policies for INSERT/UPDATE/DELETE are created for 'anon'.
-- This means only the Service Role (Server-Side) can modify data.
