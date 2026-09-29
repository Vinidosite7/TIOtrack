-- TioTrack v9 — Pages + Domains operational fields

alter table public.traffic_domains add column if not exists cname_target text;
alter table public.traffic_domains add column if not exists dns_last_checked_at timestamptz;
alter table public.traffic_domains add column if not exists edge_sync_error text;
alter table public.traffic_domains add column if not exists cf_error text;

alter table public.traffic_pages add column if not exists last_deployed_at timestamptz;

create index if not exists traffic_domains_workspace_dns_idx
  on public.traffic_domains(workspace_id, dns_status, updated_at desc);

create index if not exists traffic_routes_page_idx
  on public.traffic_routes(page_id, enabled);

notify pgrst, 'reload schema';
