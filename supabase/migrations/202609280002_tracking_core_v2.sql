-- TioTrack Tracking Core V2
-- Product/Funnel + Lead Identity + normalized orders/events + signal outbox.
-- Architecture inspired by common attribution patterns, implemented independently for TioTrack.

create extension if not exists pgcrypto;

-- ── Products / funnels ─────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('draft','active','paused','archived')),
  price_cents bigint,
  currency text not null default 'BRL',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, slug)
);

create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  funnel_type text not null check (funnel_type in (
    'site','site_telegram','telegram','site_whatsapp','whatsapp','ecommerce','custom'
  )),
  status text not null default 'active' check (status in ('draft','active','paused','archived')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funnel_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  step_key text not null,
  name text not null,
  step_order integer not null default 0,
  channel text not null default 'web' check (channel in ('web','telegram','whatsapp','checkout','payment','custom')),
  page_id uuid references public.traffic_pages(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(funnel_id, step_key)
);

create index if not exists products_workspace_idx on public.products(workspace_id, updated_at desc);
create index if not exists funnels_workspace_idx on public.funnels(workspace_id, updated_at desc);
create index if not exists funnels_product_idx on public.funnels(product_id, updated_at desc);
create index if not exists funnel_steps_funnel_idx on public.funnel_steps(funnel_id, step_order asc);

-- ── Identity / attribution ──────────────────────────────────────────────
create table if not exists public.tracking_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id text not null,
  visitor_id text,
  session_id text,
  click_id text,
  product_id uuid references public.products(id) on delete set null,
  funnel_id uuid references public.funnels(id) on delete set null,
  platform text not null default 'organic' check (platform in ('tiktok','meta','google','kwai','organic','unknown')),
  click_param text,
  click_value text,
  first_landing_url text,
  first_referer text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  first_touch jsonb not null default '{}'::jsonb,
  last_touch jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  unique(workspace_id, lead_id)
);

create index if not exists tracking_leads_workspace_click_idx on public.tracking_leads(workspace_id, click_id);
create index if not exists tracking_leads_workspace_session_idx on public.tracking_leads(workspace_id, session_id);
create index if not exists tracking_leads_product_idx on public.tracking_leads(product_id, last_seen_at desc);
create index if not exists tracking_leads_funnel_idx on public.tracking_leads(funnel_id, last_seen_at desc);

-- ── Canonical event stream ──────────────────────────────────────────────
create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id text not null,
  dedup_key text not null,
  event_name text not null,
  source text not null default 'browser' check (source in ('browser','edge','server','webhook','manual')),
  lead_id text,
  visitor_id text,
  session_id text,
  click_id text,
  product_id uuid references public.products(id) on delete set null,
  funnel_id uuid references public.funnels(id) on delete set null,
  funnel_step_id uuid references public.funnel_steps(id) on delete set null,
  step_key text,
  order_id text,
  amount_cents bigint,
  currency text,
  status text,
  url text,
  referer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  utm_id text,
  ttclid text,
  fbclid text,
  gclid text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  unique(workspace_id, event_id),
  unique(workspace_id, dedup_key)
);

create index if not exists tracking_events_workspace_time_idx on public.tracking_events(workspace_id, occurred_at desc);
create index if not exists tracking_events_lead_idx on public.tracking_events(workspace_id, lead_id, occurred_at desc);
create index if not exists tracking_events_product_idx on public.tracking_events(product_id, occurred_at desc);
create index if not exists tracking_events_funnel_idx on public.tracking_events(funnel_id, occurred_at desc);
create index if not exists tracking_events_order_idx on public.tracking_events(workspace_id, order_id);

-- ── Orders / payment lifecycle ──────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  funnel_id uuid references public.funnels(id) on delete set null,
  lead_id text,
  session_id text,
  click_id text,
  provider text not null default 'api',
  external_id text not null,
  status text not null check (status in (
    'initiate_checkout','waiting_payment','paid','failed','refunded','chargeback','cancelled'
  )),
  amount_cents bigint not null default 0,
  currency text not null default 'BRL',
  customer_name text,
  customer_email text,
  customer_phone text,
  payment_method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  unique(workspace_id, provider, external_id)
);

create index if not exists orders_workspace_time_idx on public.orders(workspace_id, updated_at desc);
create index if not exists orders_lead_idx on public.orders(workspace_id, lead_id, updated_at desc);
create index if not exists orders_product_idx on public.orders(product_id, updated_at desc);

-- ── Signal delivery outbox (future TikTok/Meta/Kwai/Google workers) ─────
create table if not exists public.signal_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tracking_event_id uuid not null references public.tracking_events(id) on delete cascade,
  destination text not null check (destination in ('tiktok','meta','kwai','google')),
  event_name text not null,
  status text not null default 'queued' check (status in ('queued','processing','sent','retry','failed','cancelled')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  response jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(tracking_event_id, destination, event_name)
);

create index if not exists signal_outbox_queue_idx on public.signal_outbox(status, next_attempt_at asc);
create index if not exists signal_outbox_workspace_idx on public.signal_outbox(workspace_id, created_at desc);

-- ── Server-to-server API keys (store only SHA-256 hashes) ───────────────
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  secret_hash text not null unique,
  scopes text[] not null default array['conversions:write']::text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_keys_workspace_idx on public.api_keys(workspace_id, created_at desc);
create index if not exists api_keys_prefix_idx on public.api_keys(key_prefix);

-- ── Extend existing legacy/current tables without breaking UI ───────────
alter table public.sessions add column if not exists lead_id text;
alter table public.sessions add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.sessions add column if not exists funnel_id uuid references public.funnels(id) on delete set null;
create index if not exists sessions_workspace_lead_idx on public.sessions(workspace_id, lead_id);

alter table public.traffic_events add column if not exists lead_id text;
alter table public.traffic_events add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.traffic_events add column if not exists funnel_id uuid references public.funnels(id) on delete set null;
alter table public.traffic_events add column if not exists step_key text;
alter table public.traffic_events add column if not exists canonical_event_id text;

alter table public.conversions add column if not exists lead_id text;
alter table public.conversions add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.conversions add column if not exists funnel_id uuid references public.funnels(id) on delete set null;
alter table public.conversions add column if not exists order_id text;

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.products enable row level security;
alter table public.funnels enable row level security;
alter table public.funnel_steps enable row level security;
alter table public.tracking_leads enable row level security;
alter table public.tracking_events enable row level security;
alter table public.orders enable row level security;
alter table public.signal_outbox enable row level security;
alter table public.api_keys enable row level security;

-- Reusable owner policies. Public collectors write through service-role API routes.
do $$ begin
  create policy "products_workspace_owner" on public.products for all
    using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "funnels_workspace_owner" on public.funnels for all
    using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "funnel_steps_workspace_owner" on public.funnel_steps for all
    using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "tracking_leads_workspace_owner_read" on public.tracking_leads for select
    using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "tracking_events_workspace_owner_read" on public.tracking_events for select
    using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "orders_workspace_owner" on public.orders for all
    using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "signal_outbox_workspace_owner_read" on public.signal_outbox for select
    using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "api_keys_workspace_owner" on public.api_keys for all
    using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- Realtime for live funnel/event UI.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tracking_events'
  ) then
    alter publication supabase_realtime add table public.tracking_events;
  end if;
end $$;
