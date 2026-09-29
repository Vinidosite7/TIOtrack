-- TioTrack v10 · ensure traffic_events is published to Supabase Realtime.
-- Safe to run more than once.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'traffic_events'
  ) then
    alter publication supabase_realtime add table public.traffic_events;
  end if;
end $$;
