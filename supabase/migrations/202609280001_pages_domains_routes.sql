-- TioTrack Pages + Domains + Traffic Routes
-- Multi-tenant static hosting MVP + hostname/path routing for the Traffic Edge.

create extension if not exists pgcrypto;

-- ── Pages / deployments ────────────────────────────────────────────────
create table if not exists public.traffic_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'draft' check (status in ('draft','online','archived','error')),
  current_deployment_id uuid,
  files_count integer not null default 0,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, slug)
);

create table if not exists public.traffic_page_deployments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  page_id uuid not null references public.traffic_pages(id) on delete cascade,
  version integer not null,
  storage_prefix text not null,
  entry_file text not null default 'index.html',
  status text not null default 'published' check (status in ('uploading','published','failed','archived')),
  files_count integer not null default 0,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  unique(page_id, version)
);

alter table public.traffic_pages
  add constraint traffic_pages_current_deployment_fk
  foreign key (current_deployment_id) references public.traffic_page_deployments(id) on delete set null;

create table if not exists public.traffic_page_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  page_id uuid not null references public.traffic_pages(id) on delete cascade,
  deployment_id uuid not null references public.traffic_page_deployments(id) on delete cascade,
  path text not null,
  content_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  unique(deployment_id, path)
);

create index if not exists traffic_pages_workspace_idx on public.traffic_pages(workspace_id, updated_at desc);
create index if not exists traffic_page_deployments_page_idx on public.traffic_page_deployments(page_id, version desc);
create index if not exists traffic_page_files_deployment_idx on public.traffic_page_files(deployment_id, path);

-- Public bucket used only for generated/static page assets. Uploads are done with service role via API routes.
insert into storage.buckets (id, name, public, file_size_limit)
values ('tiotrack-pages', 'tiotrack-pages', true, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- ── Domains ────────────────────────────────────────────────────────────
alter table public.traffic_domains add column if not exists dns_status text not null default 'pending';
alter table public.traffic_domains add column if not exists ssl_status text not null default 'pending';
alter table public.traffic_domains add column if not exists edge_enabled boolean not null default true;
alter table public.traffic_domains add column if not exists edge_synced_at timestamptz;
alter table public.traffic_domains add column if not exists cf_custom_hostname_id text;
alter table public.traffic_domains add column if not exists cf_status text;
alter table public.traffic_domains add column if not exists cf_ssl_status text;
alter table public.traffic_domains add column if not exists cf_validation jsonb not null default '{}'::jsonb;

-- ── Routes ─────────────────────────────────────────────────────────────
create table if not exists public.traffic_routes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  domain_id uuid not null references public.traffic_domains(id) on delete cascade,
  path_prefix text not null default '/',
  name text not null default 'Rota principal',
  enabled boolean not null default true,
  priority integer not null default 100,
  origin_type text not null default 'external' check (origin_type in ('external','page')),
  external_origin_url text,
  page_id uuid references public.traffic_pages(id) on delete set null,
  rule_id uuid references public.traffic_rules(id) on delete set null,
  inject_tracker boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(domain_id, path_prefix)
);

create index if not exists traffic_routes_workspace_idx on public.traffic_routes(workspace_id, updated_at desc);
create index if not exists traffic_routes_domain_idx on public.traffic_routes(domain_id, priority asc, path_prefix);

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.traffic_pages enable row level security;
alter table public.traffic_page_deployments enable row level security;
alter table public.traffic_page_files enable row level security;
alter table public.traffic_routes enable row level security;

do $$ begin
  create policy "traffic_pages_workspace_owner" on public.traffic_pages
    for all using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "traffic_page_deployments_workspace_owner" on public.traffic_page_deployments
    for all using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "traffic_page_files_workspace_owner" on public.traffic_page_files
    for all using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "traffic_routes_workspace_owner" on public.traffic_routes
    for all using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;
