-- NanoRev — Supabase schema.
-- Run ONCE in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
--
-- Design: each entity is stored as a JSON document so the Express backend's
-- object shapes round-trip exactly (server/store.mjs is the only code that
-- touches these tables). `id` is the entity's natural key (product id, page id,
-- link slug, order ref, …). `seq` preserves insertion order across restarts.
--
-- The backend connects with the SERVICE ROLE key, which bypasses Row Level
-- Security. RLS is enabled with no policies so the public anon key (never used
-- by this app) cannot read or write these tables.

create table if not exists products (
  id text primary key,
  doc jsonb not null,
  seq bigserial,
  updated_at timestamptz not null default now()
);
create table if not exists categories (
  id text primary key,
  doc jsonb not null,
  seq bigserial,
  updated_at timestamptz not null default now()
);
create table if not exists workshops (
  id text primary key,
  doc jsonb not null,
  seq bigserial,
  updated_at timestamptz not null default now()
);
create table if not exists pages (
  id text primary key,
  doc jsonb not null,
  seq bigserial,
  updated_at timestamptz not null default now()
);
create table if not exists links (
  id text primary key,          -- link slug
  doc jsonb not null,
  seq bigserial,
  updated_at timestamptz not null default now()
);
create table if not exists orders (
  id text primary key,          -- order ref
  doc jsonb not null,
  seq bigserial,
  updated_at timestamptz not null default now()
);
create table if not exists commissions (
  id text primary key,
  doc jsonb not null,
  seq bigserial,
  updated_at timestamptz not null default now()
);

-- Lock the tables down to the service role only.
alter table products    enable row level security;
alter table categories  enable row level security;
alter table workshops   enable row level security;
alter table pages       enable row level security;
alter table links       enable row level security;
alter table orders      enable row level security;
alter table commissions enable row level security;

-- Product image uploads live in Storage (a public bucket, served by the CDN).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Allow public read of uploaded images; writes go through the service role
-- (the Express /api/admin/upload route), which bypasses these policies.
drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');
