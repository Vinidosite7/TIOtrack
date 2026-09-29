-- TioTrack Traffic Center MVP
-- Apply with Supabase CLI or SQL editor before opening /traffic.

create extension if not exists pgcrypto;

create table if not exists public.traffic_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default 'Regra principal',
  enabled boolean not null default true,
  allowed_countries text[] not null default array['BR']::text[],
  allowed_devices text[] not null default array['mobile','desktop','tablet']::text[],
  allowed_os text[] not null default array[]::text[],
  blocked_user_agents text[] not null default array['curl','wget','python-requests','go-http-client','headlesschrome']::text[],
  challenge_risk_threshold integer not null default 40 check (challenge_risk_threshold between 0 and 100),
  block_risk_threshold integer not null default 75 check (block_risk_threshold between 0 and 100),
  default_action text not null default 'allow' check (default_action in ('allow','challenge','block')),
  deny_action text not null default 'block' check (deny_action in ('challenge','block','redirect')),
  redirect_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists traffic_rules_workspace_name_uidx on public.traffic_rules(workspace_id, name);
create index if not exists traffic_rules_workspace_enabled_idx on public.traffic_rules(workspace_id, enabled);

create table if not exists public.traffic_domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  hostname text not null,
  status text not null default 'pending' check (status in ('pending','active','paused','error')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, hostname)
);

create table if not exists public.traffic_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  request_id text not null,
  visitor_id text,
  session_id text,
  click_id text,
  event_name text not null default 'page_view',
  path text,
  landing_url text,
  referer text,
  ip text,
  user_agent text,
  country text,
  region text,
  city text,
  asn text,
  device_type text,
  os text,
  browser text,
  language text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  utm_id text,
  fbclid text,
  ttclid text,
  gclid text,
  action text not null default 'allow' check (action in ('allow','challenge','block','redirect')),
  reason text,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists traffic_events_workspace_created_idx on public.traffic_events(workspace_id, created_at desc);
create index if not exists traffic_events_workspace_session_idx on public.traffic_events(workspace_id, session_id);
create index if not exists traffic_events_workspace_click_idx on public.traffic_events(workspace_id, click_id);
create index if not exists traffic_events_workspace_action_idx on public.traffic_events(workspace_id, action, created_at desc);

alter table public.sessions add column if not exists visitor_id text;
alter table public.sessions add column if not exists click_id text;
alter table public.sessions add column if not exists gclid text;
alter table public.sessions add column if not exists fbp text;
alter table public.sessions add column if not exists fbc text;
alter table public.sessions add column if not exists country text;
alter table public.sessions add column if not exists region text;
alter table public.sessions add column if not exists device_type text;
alter table public.sessions add column if not exists browser text;
alter table public.sessions add column if not exists os text;
alter table public.sessions add column if not exists last_seen_at timestamptz default now();
create unique index if not exists sessions_workspace_session_uidx on public.sessions(workspace_id, session_id);
create index if not exists sessions_workspace_click_idx on public.sessions(workspace_id, click_id);

alter table public.conversions add column if not exists click_id text;
alter table public.conversions add column if not exists fbclid text;
alter table public.conversions add column if not exists gclid text;

alter table public.traffic_rules enable row level security;
alter table public.traffic_domains enable row level security;
alter table public.traffic_events enable row level security;

-- Workspace owners can manage their own Traffic Center configuration and read logs.
do $$ begin
  create policy "traffic_rules_workspace_owner" on public.traffic_rules
    for all using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "traffic_domains_workspace_owner" on public.traffic_domains
    for all using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "traffic_events_workspace_owner_read" on public.traffic_events
    for select using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- Public collector writes through the service-role API route, not directly with anon keys.

-- Realtime powers /traffic/live. Ignore if the table is already in the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'traffic_events'
  ) then
    alter publication supabase_realtime add table public.traffic_events;
  end if;
end $$;
