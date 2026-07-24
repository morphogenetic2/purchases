# Deployment Guide

This guide will help you deploy the "IBEC orders manager" to the web for free. You do not need coding skills, but you will need to copy and paste some values accurately.

## Prerequisites

You need accounts for:

1. **GitHub** (to store the code) - [Sign up](https://github.com/join)
2. **Supabase** (the database) - [Sign up](https://supabase.com/dashboard/sign-up)
3. **Vercel** (the hosting) - [Sign up](https://vercel.com/signup)

---

## Step 1: Push Code to GitHub

*If you haven't already:*

1. Create a **New Repository** on GitHub.
2. Upload/Push this project code to it.
   *(If you are reading this on GitHub, you can skip this step, just click "Fork" to get your own copy).*

---

## Step 2: Set up the Database (Supabase)

1. **Create Project**: Go to Supabase and click **"New Project"**.
2. **Parameters**:
    * **Name**: `OrdersManager` (or anything you like).
    * **Password**: Generate a strong password. **Write this down**, though we won't strictly need it for the app, it's good practice.
    * **Region**: Choose one close to you.
3. **Wait**: It takes about 2 minutes to provision.

### Create the Table

1. Once the project is ready, look at the left sidebar and click **SQL Editor** (icon looks like a terminal `>_`).
2. Click **New Query**.
3. Copy the code below (or from the `schema.sql` file in this repo) and paste it into the editor:

```sql
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

-- Enable Row Level Security (Security Shield)
alter table public.orders enable row level security;

-- Allow public READ access (so the dashboard updates in realtime)
create policy "Allow Anon Select"
on public.orders
for select
to anon, authenticated
using (true);
```

1. Click **Run** (bottom right). You should see "Success".

### Get Your Keys

1. Go to **Project Settings** (Gear icon, bottom left).
2. Click **API**.
3. You will see `Project URL` and `Project API keys`. Keep this tab open.

---

## Step 3: Hosting (Vercel)

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. **Import Git Repository**: Find your GitHub repo (`purchases`) and click **Import**.
4. **Configure Project**:
    * Find the **Environment Variables** section and click to expand it.
    * You need to add **4 variables**:

| Name | Value Source (From Supabase "API" Settings) |
| :--- | :--- |
| `PUBLIC_SUPABASE_URL` | Copy **Project URL** |
| `PUBLIC_SUPABASE_ANON_KEY` | Copy **anon** / **public** key |
| `SUPABASE_SERVICE_ROLE_KEY` | Copy **service_role** / **secret** key (Reveal it first) |
| `LAB_PASSWORD` | **Create your own shared password** (e.g. `secret-lab-pass`) |
| `CRON_SECRET` | Create a random secret (at least 16 characters) to secure the scheduled Supabase heartbeat |

1. Click **Deploy**.
2. Wait ~1 minute. You should see "Congratulations!".

---

## Step 4: Verification

1. Click the screenshot of your app to open it.
2. **Login**: Enter the `LAB_PASSWORD` you just set.
3. **Test**: Try adding a new order. If it appears in the list, you are live!
