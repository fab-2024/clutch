-- =====================================================================
-- Clutch — Phase 5 / RPC hardening
--
-- Les deux RPC de lecture Phase 5 n'ont pas besoin de privilèges élevés.
-- On les repasse en SECURITY INVOKER :
--   - la projection délègue déjà au RPC Economy V2 existant ;
--   - la lecture du prono s'appuie sur la policy RLS user_id = auth.uid().
-- Le RPC d'écriture reste SECURITY DEFINER car il orchestre de façon atomique
-- la création Economy V2 + la conviction et vérifie auth.uid().
-- =====================================================================

create or replace function public.clutch_projection_match_frags_v2(p_match_id text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_base jsonb;
  v_k integer;
  v_choix jsonb;
begin
  v_base := public.clutch_projection_match_frags(p_match_id);
  v_k := (v_base ->> 'k')::integer;

  select jsonb_agg(
    c || jsonb_build_object(
      'convictions',
      public.clutch_projection_convictions_json((c ->> 'proba_scoring')::numeric,v_k)
    )
    order by ord
  )
  into v_choix
  from jsonb_array_elements(v_base -> 'choix') with ordinality as x(c,ord);

  return jsonb_set(v_base,'{choix}',coalesce(v_choix,'[]'::jsonb),true);
end;
$$;

create or replace function public.clutch_mon_pronostic_match_v2(p_match_id text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_p public.pronostics_classes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select * into v_p
  from public.pronostics_classes
  where user_id = auth.uid()
    and match_id = p_match_id
  limit 1;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_p.id,
    'match_id', v_p.match_id,
    'choix', v_p.choix,
    'conviction', v_p.conviction,
    'multiplicateur_conviction', v_p.multiplicateur_conviction,
    'proba_figee', v_p.proba_figee,
    'proba_scoring', v_p.proba_scoring,
    'k_frags', v_p.k_frags,
    'k_effectif', public.clutch_k_conviction(v_p.k_frags,v_p.conviction),
    'statut', v_p.statut,
    'delta_frags', v_p.delta_frags,
    'gain_si_correct', public.clutch_delta_frags_conviction(v_p.proba_scoring,true,v_p.k_frags,v_p.conviction),
    'perte_si_faux', public.clutch_delta_frags_conviction(v_p.proba_scoring,false,v_p.k_frags,v_p.conviction),
    'cree_le', v_p.cree_le,
    'regle_le', v_p.regle_le
  );
end;
$$;

revoke execute on function public.clutch_mon_pronostic_match_v2(text) from public,anon;
revoke execute on function public.clutch_projection_match_frags_v2(text) from public;

grant execute on function public.clutch_mon_pronostic_match_v2(text) to authenticated;
grant execute on function public.clutch_projection_match_frags_v2(text) to anon,authenticated;
