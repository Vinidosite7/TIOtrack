-- Tiotrack — TikTok workspace integrations
create extension if not exists pgcrypto;

create table if not exists public.tiktok_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default 'TikTok principal',
  pixel_code text not null,
  advertiser_id text,
  access_token_encrypted text not null,
  enabled boolean not null default true,
  last_test_status text,
  last_test_message text,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tiktok_integrations_workspace_idx
  on public.tiktok_integrations(workspace_id, updated_at desc);

create unique index if not exists tiktok_integrations_workspace_pixel_uidx
  on public.tiktok_integrations(workspace_id, pixel_code);

alter table public.tiktok_integrations enable row level security;

do $$ begin
  create policy "tiktok_integrations_workspace_owner_read"
    on public.tiktok_integrations
    for select
    using (
      exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

revoke all on table public.tiktok_integrations from anon, authenticated;
grant select on table public.tiktok_integrations to authenticated;
grant all on table public.tiktok_integrations to service_role;

notify pgrst, 'reload schema';
