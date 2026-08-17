-- =====================================================================
-- Clutch — 24_economy_v1_safe_shims.sql
--
-- Compatibilité temporaire pour les anciens bundles déjà servis : les anciens
-- RPC restent appelables mais ne peuvent plus écrire dans l'économie V1.
-- =====================================================================

create or replace function public.placer_pari(
  p_match_id text,
  p_marche text,
  p_choix text,
  p_mise integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_marche <> 'vainqueur' then
    raise exception 'Les marchés secondaires ne sont plus classés. Utilise le vainqueur du match.';
  end if;

  v_result := public.placer_pronostic_classe(p_match_id, p_choix);
  return v_result || jsonb_build_object(
    'mise',0,
    'cote',1,
    'gain',0,
    'legacy_shim',true
  );
end;
$$;

create or replace function public.placer_call(
  p_event_id text,
  p_equipe_id text,
  p_mise integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.placer_call_v2(p_event_id,p_equipe_id)
    || jsonb_build_object('mise',0,'gain',0,'legacy_shim',true);
end;
$$;

create or replace function public.reclamer_prime(p_saison_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'montant',0,
    'desactive',true,
    'message','Les bonus quotidiens en Frags ont été retirés.'
  )
$$;

create or replace function public.rattraper_paris_auto(p_saison_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$ select jsonb_build_object('poses',0,'desactive',true) $$;

create or replace function public.clutch_pari_auto(p_user uuid,p_match_id text)
returns integer
language sql
security definer
set search_path = public
as $$ select 0 $$;

revoke execute on function public.placer_pari(text,text,text,integer) from public,anon;
revoke execute on function public.placer_call(text,text,integer) from public,anon;
revoke execute on function public.reclamer_prime(text) from public,anon;
revoke execute on function public.rattraper_paris_auto(text) from public,anon;
revoke execute on function public.clutch_pari_auto(uuid,text) from public,anon,authenticated;

grant execute on function public.placer_pari(text,text,text,integer) to authenticated;
grant execute on function public.placer_call(text,text,integer) to authenticated;
grant execute on function public.reclamer_prime(text) to authenticated;
grant execute on function public.rattraper_paris_auto(text) to authenticated;
