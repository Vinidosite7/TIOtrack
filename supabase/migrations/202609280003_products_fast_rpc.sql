-- TioTrack v8.1 — fast product/funnel creation in one DB transaction.
-- One RPC replaces multiple sequential round-trips.

create or replace function public.tio_create_product_bundle(
  p_workspace_id uuid,
  p_name text,
  p_base_slug text,
  p_status text,
  p_price_cents bigint,
  p_currency text,
  p_product_metadata jsonb,
  p_funnel_name text,
  p_funnel_type text,
  p_funnel_config jsonb,
  p_steps jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slug text := coalesce(nullif(trim(p_base_slug), ''), 'produto');
  v_product public.products%rowtype;
  v_funnel public.funnels%rowtype;
  v_step jsonb;
  v_step_row public.funnel_steps%rowtype;
  v_steps jsonb := '[]'::jsonb;
  v_i integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.user_id = v_uid
  ) then
    raise exception 'Sem acesso ao workspace' using errcode = '42501';
  end if;

  -- Resolve slug collisions inside Postgres, without extra network requests.
  for v_i in 0..99 loop
    begin
      insert into public.products (
        workspace_id, name, slug, status, price_cents, currency, metadata, updated_at
      ) values (
        p_workspace_id,
        left(trim(p_name), 160),
        v_slug,
        case when p_status = 'draft' then 'draft' else 'active' end,
        p_price_cents,
        upper(left(coalesce(nullif(trim(p_currency), ''), 'BRL'), 8)),
        coalesce(p_product_metadata, '{}'::jsonb),
        now()
      )
      returning * into v_product;
      exit;
    exception when unique_violation then
      v_slug := coalesce(nullif(trim(p_base_slug), ''), 'produto') || '-' || (v_i + 2)::text;
    end;
  end loop;

  if v_product.id is null then
    raise exception 'Não foi possível gerar um slug único para o produto';
  end if;

  insert into public.funnels (
    workspace_id, product_id, name, funnel_type, status, config, updated_at
  ) values (
    p_workspace_id,
    v_product.id,
    left(coalesce(nullif(trim(p_funnel_name), ''), trim(p_name) || ' · Principal'), 180),
    p_funnel_type,
    case when p_status = 'draft' then 'draft' else 'active' end,
    coalesce(p_funnel_config, '{}'::jsonb),
    now()
  )
  returning * into v_funnel;

  for v_step in
    select value from jsonb_array_elements(coalesce(p_steps, '[]'::jsonb))
  loop
    insert into public.funnel_steps (
      workspace_id,
      funnel_id,
      step_key,
      name,
      step_order,
      channel,
      page_id,
      config,
      updated_at
    ) values (
      p_workspace_id,
      v_funnel.id,
      coalesce(v_step->>'step_key', 'step'),
      coalesce(v_step->>'name', 'Etapa'),
      coalesce((v_step->>'step_order')::integer, 0),
      coalesce(v_step->>'channel', 'web'),
      case
        when nullif(v_step->>'page_id', '') is null then null
        else (v_step->>'page_id')::uuid
      end,
      coalesce(v_step->'config', '{}'::jsonb),
      now()
    )
    returning * into v_step_row;

    v_steps := v_steps || jsonb_build_array(to_jsonb(v_step_row));
  end loop;

  return jsonb_build_object(
    'ok', true,
    'product', to_jsonb(v_product),
    'funnel', to_jsonb(v_funnel),
    'steps', v_steps
  );
end;
$$;

revoke all on function public.tio_create_product_bundle(
  uuid, text, text, text, bigint, text, jsonb, text, text, jsonb, jsonb
) from public, anon;

grant execute on function public.tio_create_product_bundle(
  uuid, text, text, text, bigint, text, jsonb, text, text, jsonb, jsonb
) to authenticated, service_role;

-- Explicit read/update grants; RLS remains the authorization boundary.
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.funnels to authenticated;
grant select, insert, update, delete on public.funnel_steps to authenticated;

notify pgrst, 'reload schema';
