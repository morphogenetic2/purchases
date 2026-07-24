-- Run this once in Supabase Dashboard -> SQL Editor against an existing project.
-- It removes the legacy policy that lets anyone with the public project key read
-- every order directly through the Data API and Realtime.

drop policy if exists "Allow Anon Select" on public.orders;

-- The application expects this table for the requester-management dialog.
create table if not exists public.requesters (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  initials text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;
alter table public.requesters enable row level security;
