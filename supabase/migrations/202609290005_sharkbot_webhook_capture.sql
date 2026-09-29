-- TioTrack — SharkBot webhook capture inbox
-- Captura o payload bruto primeiro; normalização/atribuição vem após vermos o contrato real do SharkBot.

create extension if not exists pgcrypto;

create table if not exists public.integration_webhook_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  event_type text,
  external_id text,
  content_type text,
  payload jsonb not null default '{}'::jsonb,
  raw_body text,
  query_params jsonb not null default '{}'::jsonb,
  request_headers jsonb not null default '{}'::jsonb,
  source_ip text,
  relay_url text,
  relay_status integer,
  relay_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists integration_webhook_events_workspace_time_idx
  on public.integration_webhook_events(workspace_id, received_at desc);

create index if not exists integration_webhook_events_provider_time_idx
  on public.integration_webhook_events(workspace_id, provider, received_at desc);

create index if not exists integration_webhook_events_external_idx
  on public.integration_webhook_events(workspace_id, provider, external_id)
  where external_id is not null;

alter table public.integration_webhook_events enable row level security;

do $$ begin
  create policy "integration_webhook_events_workspace_owner_read"
    on public.integration_webhook_events
    for select
    using (
      exists (
        select 1 from public.workspaces w
        where w.id = workspace_id
          and w.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

revoke all on table public.integration_webhook_events from anon, authenticated;
grant select on table public.integration_webhook_events to authenticated;

notify pgrst, 'reload schema';
